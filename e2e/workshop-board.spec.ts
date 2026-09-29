import { client, minutesAgo, workshopQueueItem } from './fixtures/data'
import { expect, test } from './fixtures/test'

// The shop floor's queue. Runs on desktop and on both tablets (@taller).

test.describe('tablero de taller', { tag: '@taller' }, () => {
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

    await page.goto('/workshop-board')
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

    await page.goto('/workshop-board')
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

    await page.goto('/workshop-board')
    await page.getByRole('button', { name: 'Tomar' }).click()
    await page.locator('.modal.show').getByRole('button', { name: 'Tomar' }).click()

    await expect(page.getByText('Otro operador ya tomó esta orden.')).toBeVisible()
    await expect(page).toHaveURL(/\/workshop-board$/)
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

    await page.goto('/workshop-board')
    await expect(page.locator('.workshop-card')).toHaveCount(2)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
