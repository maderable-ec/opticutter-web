import type { Page } from '@playwright/test'

import { client, minutesAgo, workshopQueueItem } from './fixtures/data'
import { stubHome } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// The shop floor's queue. Runs on desktop and on both tablets (@taller).

// The tallest pair the board shows every day: a prioritized head of queue, and an order on the saw
// with its three clocks and two buttons. The row is as tall as its tallest card.
const tallestRow = () => [
  workshopQueueItem({ orderId: 1, orderCode: 'ORD-000001', isPriority: true }),
  workshopQueueItem({
    orderId: 2,
    orderCode: 'ORD-000002',
    status: 'in_process',
    statusChangedAt: minutesAgo(95),
    progress: { cutPieces: 7, totalPieces: 18 },
    activities: [
      {
        type: 'cutting',
        status: 'in_progress',
        readyAt: minutesAgo(200),
        startedAt: minutesAgo(95),
      },
      { type: 'banding', status: 'pending', readyAt: minutesAgo(80) },
    ],
  }),
]

const expectFirstRowInView = async (page: Page) => {
  const cards = page.locator('.workshop-card')
  await expect(cards).toHaveCount(2)
  const height = page.viewportSize()?.height ?? 0
  for (const card of await cards.all()) {
    const box = await card.boundingBox()
    expect(box && box.y + box.height).toBeLessThanOrEqual(height)
  }
}

test.describe('la cola del Taller', { tag: '@taller' }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs(['operador'])
  })

  test('«Siguiente» va a la prioritaria y, entre iguales, a la que se pagó primero', async ({
    page,
    api,
  }) => {
    api.get('/orders/workshop-queue', [
      workshopQueueItem({ orderId: 1, orderCode: 'ORD-000001', queuedAt: minutesAgo(30) }),
      workshopQueueItem({ orderId: 2, orderCode: 'ORD-000002', queuedAt: minutesAgo(120) }),
      workshopQueueItem({
        orderId: 3,
        orderCode: 'ORD-000003',
        queuedAt: minutesAgo(10),
        isPriority: true,
      }),
    ])

    await page.goto('/workshop')
    const next = page.locator('.workshop-card', { has: page.locator('.workshop-next') })
    await expect(next).toHaveCount(1)
    await expect(next).toContainText('ORD-000003')
  })

  test('sin prioritarias, «Siguiente» es FIFO por pago, no por creación', async ({ page, api }) => {
    api.get('/orders/workshop-queue', [
      // Quoted first, paid last: must NOT be next.
      workshopQueueItem({
        orderId: 1,
        orderCode: 'ORD-000001',
        createdAt: minutesAgo(600),
        queuedAt: minutesAgo(20),
      }),
      workshopQueueItem({
        orderId: 2,
        orderCode: 'ORD-000002',
        createdAt: minutesAgo(300),
        queuedAt: minutesAgo(90),
      }),
    ])

    await page.goto('/workshop')
    const next = page.locator('.workshop-card', { has: page.locator('.workshop-next') })
    await expect(next).toContainText('ORD-000002')
  })

  test('si «Tomar» falla, el operador se queda en el tablero viendo el motivo', async ({
    page,
    api,
  }) => {
    api.get('/orders/workshop-queue', [workshopQueueItem()])
    api.fail('PATCH', '/orders/1/activities/cutting', 409, [
      { message: 'Otro operador ya tomó esta orden.', code: 'CONFLICT' },
    ])

    await page.goto('/workshop')
    await page.getByRole('button', { name: 'Tomar' }).click()
    // The question names the act and the order, and the button repeats the verb.
    await page
      .getByRole('alertdialog', { name: 'Tomar ORD-000045' })
      .getByRole('button', { name: 'Tomar' })
      .click()

    await expect(page.getByText('Otro operador ya tomó esta orden.')).toBeVisible()
    await expect(page).toHaveURL(/\/workshop$/)
  })

  test('«Pausar» pregunta el motivo y lo manda; la tarjeta en pausa solo ofrece reanudar', async ({
    page,
    api,
  }) => {
    const cutting = {
      type: 'cutting' as const,
      status: 'in_progress' as const,
      readyAt: minutesAgo(200),
      startedAt: minutesAgo(95),
      progress: { cutPieces: 7, totalPieces: 18 },
    }
    const card = (activity: typeof cutting & { pausedAt?: string; pauseReason?: 'no_boards' }) =>
      workshopQueueItem({
        orderId: 2,
        orderCode: 'ORD-000002',
        status: 'in_process',
        statusChangedAt: minutesAgo(95),
        progress: { cutPieces: 7, totalPieces: 18 },
        activities: [activity],
      })
    // The board reads the queue again after each write: running, then paused, then running.
    let paused = false
    api.get('/orders/workshop-queue', () => [
      card(paused ? { ...cutting, pausedAt: minutesAgo(1), pauseReason: 'no_boards' } : cutting),
    ])
    api.post('/orders/2/activities/cutting/pause', () => {
      paused = true
      return { orderId: 2, orderCode: 'ORD-000002', orderStatus: 'in_process', activity: cutting }
    })
    api.post('/orders/2/activities/cutting/resume', () => {
      paused = false
      return { orderId: 2, orderCode: 'ORD-000002', orderStatus: 'in_process', activity: cutting }
    })

    await page.goto('/workshop')
    await page.getByRole('button', { name: 'Pausar corte' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Pausar corte de ORD-000002' })
    // The reason is the point: the button waits for one.
    const confirm = dialog.getByRole('button', { name: 'Pausar corte' })
    await expect(confirm).toBeDisabled()
    await expect(dialog.getByRole('radio')).toHaveText([
      'Sin tableros',
      'Sin canto',
      'Daño de máquina',
    ])
    await dialog.getByRole('radio', { name: 'Sin tableros' }).click()
    await confirm.click()

    const [sent] = api.requests('POST', '/orders/2/activities/cutting/pause')
    expect(sent?.postDataJSON()).toEqual({ reason: 'no_boards' })
    // Paused: why and since when, and the one thing to do about it.
    const paused_card = page.locator('.workshop-card')
    await expect(paused_card.locator('.workshop-pause')).toContainText(
      'Corte en pausa · Sin tableros',
    )
    await expect(paused_card.getByRole('button')).toHaveText([/Materiales/, 'Reanudar corte'])

    // Lifting it asks nothing: one tap.
    await paused_card.getByRole('button', { name: 'Reanudar corte' }).click()
    await expect(paused_card.locator('.workshop-pause')).toHaveCount(0)
    await expect(paused_card.getByRole('button', { name: 'Pausar corte' })).toBeVisible()
    expect(api.requests('POST', '/orders/2/activities/cutting/resume')).toHaveLength(1)
  })

  test('una tarjeta en pausa también entra entera en el panel del taller', async ({
    page,
    api,
  }) => {
    const [queued, running] = tallestRow()
    const [cut, banding] = running?.activities ?? []
    api.get('/orders/workshop-queue', [
      queued,
      {
        ...running,
        activities: [{ ...cut, pausedAt: minutesAgo(40), pauseReason: 'machine_failure' }, banding],
      },
    ])
    await page.goto('/workshop')
    await expect(page.locator('.workshop-pause')).toContainText('Daño de máquina')
    await expectFirstRowInView(page)
  })

  test('los materiales pasan de orden con ‹ ›, con las flechas y nunca con Alt+←', async ({
    page,
    api,
  }) => {
    api.get('/orders/workshop-queue', [
      workshopQueueItem({ orderId: 1, orderCode: 'ORD-000001' }),
      workshopQueueItem({ orderId: 2, orderCode: 'ORD-000002' }),
      workshopQueueItem({ orderId: 3, orderCode: 'ORD-000003' }),
    ])

    await page.goto('/workshop')
    await page.locator('.usage-summary').first().click()
    const dialog = page.getByRole('dialog', { name: 'ORD-000001' })
    await expect(dialog).toContainText('1 de 3')

    await dialog.getByRole('button', { name: 'Orden siguiente' }).click()
    await expect(page.getByRole('dialog', { name: 'ORD-000002' })).toContainText('2 de 3')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog', { name: 'ORD-000003' })).toBeVisible()
    // Alt+← is the browser's «back», never a page turn.
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(page.getByRole('dialog', { name: 'ORD-000003' })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('dialog', { name: 'ORD-000002' })).toBeVisible()

    // ✕ closes it: the footer's «Cerrar» is gone.
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('.modal.show')).toHaveCount(0)
  })

  test('la línea de arriba cuenta lo que hay en cola y lo que está en proceso', async ({
    page,
    api,
  }) => {
    api.get('/orders/workshop-queue', [
      workshopQueueItem({ orderId: 1, orderCode: 'ORD-000001' }),
      workshopQueueItem({ orderId: 2, orderCode: 'ORD-000002' }),
      workshopQueueItem({ orderId: 3, orderCode: 'ORD-000003', status: 'in_process' }),
    ])

    await page.goto('/workshop')
    const counts = page.locator('.workshop-counts__item')
    await expect(counts).toHaveText([/En cola\s*2/, /En proceso\s*1/])
  })

  test('la primera fila de tarjetas entra entera en el panel del taller', async ({ page, api }) => {
    api.get('/orders/workshop-queue', tallestRow())
    await page.goto('/workshop')
    await expectFirstRowInView(page)
  })

  test('una tarjeta con textos largos no desborda la pantalla', async ({ page, api }) => {
    api.get('/orders/workshop-queue', [
      workshopQueueItem({
        client: client({ firstName: 'María Fernanda de los Ángeles', lastName: 'Villavicencio' }),
        notes: 'Cocina completa y closets del departamento 1204, torre norte, edificio Mirador',
        isPriority: true,
      }),
      workshopQueueItem({ orderId: 2, orderCode: 'ORD-000046' }),
    ])

    await page.goto('/workshop')
    await expect(page.locator('.workshop-card')).toHaveCount(2)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test(
  'con «Salir del taller», el encabezado del Taller mide lo mismo que el de la oficina',
  { tag: '@taller' },
  async ({ page, api, loginAs }) => {
    // The admin's cards are taller than the operador's (they register the banding too); what the
    // workspace must not do is take height from the first row with a taller header.
    await loginAs(['administrador'])
    stubHome(api, { admin: true })
    api.get('/orders/workshop-queue', tallestRow())

    await page.goto('/home')
    const office = (await page.getByRole('banner').boundingBox())?.height
    await page.goto('/workshop')
    await expect(page.getByRole('button', { name: /^Salir del taller/ })).toBeVisible()
    expect((await page.getByRole('banner').boundingBox())?.height).toBe(office)
  },
)
