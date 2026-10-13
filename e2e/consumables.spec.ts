import type { Page } from '@playwright/test'

import {
  branchConsumables,
  consumableChange,
  consumableStatus,
  cuttingPlan,
  glueStatus,
  minutesAgo,
  scoringStatus,
  workshopQueueItem,
} from './fixtures/data'
import { stubReports } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// «Insumos»: the saw's blades and the glue, registered from the shop floor. What each card says
// and the words of each consumable are unit-tested in src/features/consumables; this is the taps.

const STATUS = '/consumables/status'
const CHANGES = '/consumables/changes'

const openSheet = async (page: Page) => {
  await page.getByRole('button', { name: /^Insumos/ }).click()
  const sheet = page.locator('.consumables-sheet')
  await expect(sheet.locator('.consumable').first()).toBeVisible()
  return sheet
}

const card = (page: Page, name: string) =>
  page.locator('.consumable').filter({ has: page.getByRole('heading', { name, exact: true }) })

test.describe('los insumos en el Taller', { tag: '@taller' }, () => {
  test('el operador registra un cambio de sierra con dos toques', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['operador'])
    api.get('/orders/workshop-queue', [workshopQueueItem()])
    api.get(STATUS, [branchConsumables()])
    const justChanged = branchConsumables([
      consumableStatus({
        gate: 'blocked',
        canUndo: true,
        meters: 0,
        boards: 0,
        lastChange: consumableChange({ id: 20, changedAt: minutesAgo(0) }),
      }),
      scoringStatus(),
    ])
    api.post(CHANGES, justChanged)

    await page.goto('/workshop')
    // Nothing is asked for until the sheet opens: the queue does not pay for it.
    expect(api.requests('GET', STATUS)).toHaveLength(0)
    const sheet = await openSheet(page)

    // What is on the saw, what it has cut, and who put it on.
    const saw = card(page, 'Sierra')
    await expect(saw).toContainText(/1\.240\sm · 86 tableros/)
    await expect(saw).toContainText('Afilada')
    await expect(saw).toContainText('Luis Operador')
    await expect(card(page, 'Incisor')).toContainText(/2\.980\sm · 201,5 tableros/)
    // The operator runs the saw: the glue is the bander's.
    await expect(sheet.locator('.consumable')).toHaveCount(2)

    api.get(STATUS, [justChanged])
    await saw.getByRole('button', { name: 'Puse una afilada' }).click()

    // One request, no question: the condition was the button.
    await expect.poll(() => api.requests('POST', CHANGES)).toHaveLength(1)
    expect(api.requests('POST', CHANGES)[0]?.postDataJSON()).toEqual({
      type: 'saw_blade',
      condition: 'sharpened',
      branchId: 1,
    })
    await expect(page.locator('.toast')).toContainText('Sierra cambiada')
    // A second tap is held back, in words, and the way to take it back is right there.
    await expect(saw).toContainText('Cambiada hace un momento')
    await expect(saw.getByRole('button', { name: 'Puse una nueva' })).toBeDisabled()
    await expect(saw.getByRole('button', { name: 'Deshacer' })).toBeVisible()
    // The other blade of the saw is untouched.
    await expect(
      card(page, 'Incisor').getByRole('button', { name: 'Puse uno afilado' }),
    ).toBeEnabled()
  })

  test('un cambio temprano muestra los metros y pide el motivo', async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/workshop-queue', [])
    api.get(STATUS, [
      branchConsumables([
        consumableStatus({
          gate: 'early',
          meters: 85,
          boards: 6,
          lastChange: consumableChange({ changedAt: minutesAgo(120) }),
        }),
        scoringStatus(),
      ]),
    ])
    api.post(CHANGES, branchConsumables())

    // An empty queue still has a saw: the way in is on the header, not on a card.
    await page.goto('/workshop')
    await expect(page.getByText('No hay órdenes en el taller.')).toBeVisible()
    const sheet = await openSheet(page)
    await card(page, 'Sierra').getByRole('button', { name: 'Puse una nueva' }).click()

    // Not refused: asked about, against the fact.
    await expect(sheet.getByRole('heading', { name: 'Cambiar sierra' })).toBeVisible()
    await expect(sheet).toContainText(/Esta sierra se puso hoy .* y lleva 85\sm \(6 tableros\)\./)
    expect(api.requests('POST', CHANGES)).toHaveLength(0)
    const confirm = sheet.getByRole('button', { name: 'Registrar cambio' })
    await expect(confirm).toBeDisabled()
    // A blade's reasons, not the glue's.
    await expect(sheet.getByRole('radio')).toHaveText(['Se dañó', 'No corta bien', 'Otro motivo'])

    await sheet.getByRole('radio', { name: 'Se dañó' }).click()
    await confirm.click()

    await expect.poll(() => api.requests('POST', CHANGES)).toHaveLength(1)
    expect(api.requests('POST', CHANGES)[0]?.postDataJSON()).toEqual({
      type: 'saw_blade',
      condition: 'new',
      reason: 'damaged',
      branchId: 1,
    })
    // Back on the cards once it is done.
    await expect(sheet.getByRole('heading', { name: 'Insumos' })).toBeVisible()
  })

  test('«Volver» deja la pregunta sin registrar nada', async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/workshop-queue', [])
    api.get(STATUS, [branchConsumables([consumableStatus({ gate: 'early' }), scoringStatus()])])

    await page.goto('/workshop')
    const sheet = await openSheet(page)
    await card(page, 'Sierra').getByRole('button', { name: 'Puse una afilada' }).click()
    await sheet.getByRole('button', { name: 'Volver' }).click()

    await expect(sheet.locator('.consumable')).toHaveCount(2)
    expect(api.requests('POST', CHANGES)).toHaveLength(0)
  })

  test('quien registró el cambio lo deshace con un toque', async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/workshop-queue', [])
    api.get(STATUS, [
      branchConsumables([
        consumableStatus({
          gate: 'early',
          canUndo: true,
          meters: 0,
          boards: 0,
          lastChange: consumableChange({ id: 20, changedAt: minutesAgo(3) }),
        }),
        scoringStatus(),
      ]),
    ])
    api.post(/^\/consumables\/changes\/\d+\/void$/, branchConsumables())

    await page.goto('/workshop')
    await openSheet(page)
    const saw = card(page, 'Sierra')
    await expect(saw).toContainText('Lo registraste hace poco')
    api.get(STATUS, [branchConsumables()])
    await saw.getByRole('button', { name: 'Deshacer' }).click()

    await expect.poll(() => api.requests('POST', '/consumables/changes/20/void')).toHaveLength(1)
    await expect(page.locator('.toast')).toContainText('Cambio deshecho')
    // The blade that was on is on again.
    await expect(saw).toContainText(/1\.240\sm/)
    await expect(saw.getByRole('button', { name: 'Deshacer' })).toHaveCount(0)
  })

  test('el canteador carga la goma en la cantidad estándar o la ajusta', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['canteador'])
    api.get('/orders/workshop-queue', [])
    api.get(STATUS, [branchConsumables([glueStatus()])])
    api.post(CHANGES, branchConsumables([glueStatus()]))

    await page.goto('/workshop')
    const sheet = await openSheet(page)
    const glue = card(page, 'Goma')
    await expect(sheet.locator('.consumable')).toHaveCount(1)
    await expect(glue).toContainText(/310\sm · 4 órdenes canteadas/)
    // The control already sits on the standard load: the usual one is a single tap.
    await expect(glue.getByRole('button', { name: 'Cargué 5 kg' })).toBeVisible()

    await glue.getByRole('button', { name: 'Medio kilo menos' }).click()
    await glue.getByRole('button', { name: 'Cargué 4,5 kg' }).click()

    await expect.poll(() => api.requests('POST', CHANGES)).toHaveLength(1)
    expect(api.requests('POST', CHANGES)[0]?.postDataJSON()).toEqual({
      type: 'glue',
      quantity: 4.5,
      branchId: 1,
    })
    await expect(page.locator('.toast')).toContainText('Goma cargada')
  })

  test('un rechazo del API se dice en la tarjeta que lo pidió', async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/workshop-queue', [])
    api.get(STATUS, [branchConsumables()])
    api.fail('POST', CHANGES, 409, [
      { code: 'CONFLICT', message: 'Ya se registró un cambio de sierra hace un momento' },
    ])

    await page.goto('/workshop')
    await openSheet(page)
    await card(page, 'Sierra').getByRole('button', { name: 'Puse una nueva' }).click()

    await expect(card(page, 'Sierra').getByRole('alert')).toContainText(
      'Ya se registró un cambio de sierra hace un momento',
    )
    await expect(card(page, 'Incisor').getByRole('alert')).toHaveCount(0)
  })

  test('desde el lienzo de corte se abre en la sucursal de la orden', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    api.get('/orders/41/cutting-plan', cuttingPlan({ branchId: 2 }))
    api.get(STATUS, [
      branchConsumables([consumableStatus(), scoringStatus(), glueStatus()], {
        branchId: 2,
        branchName: 'Norte',
      }),
    ])

    await page.goto('/workshop/orders/41')
    const sheet = await openSheet(page)

    // The order is on Norte's saw: no branch to pick, and the admin sees the three.
    const [request] = api.requests('GET', STATUS)
    expect(new URL(request?.url() ?? '').searchParams.get('branchId')).toBe('2')
    await expect(sheet).toContainText('Norte')
    await expect(sheet.getByRole('radiogroup', { name: 'Sucursal' })).toHaveCount(0)
    await expect(sheet.locator('.consumable')).toHaveCount(3)
  })
})

test('el administrador elige la sucursal en la cola del Taller', async ({ page, api, loginAs }) => {
  await loginAs(['administrador'])
  api.get('/orders/workshop-queue', [])
  api.get(STATUS, [
    branchConsumables(),
    branchConsumables([consumableStatus({ meters: 55, boards: 4 })], {
      branchId: 2,
      branchName: 'Norte',
    }),
  ])
  api.post(CHANGES, branchConsumables())

  await page.goto('/workshop')
  const sheet = await openSheet(page)
  const branches = sheet.getByRole('radiogroup', { name: 'Sucursal' })
  await expect(branches.getByRole('radio', { name: 'Matriz' })).toBeChecked()

  await branches.getByRole('radio', { name: 'Norte' }).click()
  await expect(card(page, 'Sierra')).toContainText(/55\sm · 4 tableros/)
  await card(page, 'Sierra').getByRole('button', { name: 'Puse una nueva' }).click()

  await expect.poll(() => api.requests('POST', CHANGES)).toHaveLength(1)
  expect(api.requests('POST', CHANGES)[0]?.postDataJSON()).toMatchObject({ branchId: 2 })
})

test('el vendedor no tiene «Insumos» en el lienzo', async ({ page, api, loginAs }) => {
  await loginAs(['vendedor'])
  api.get('/orders/41/cutting-plan', cuttingPlan())

  await page.goto('/workshop/orders/41')
  await expect(page.getByText('ORD-000041')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Insumos/ })).toHaveCount(0)
})

test.describe('el reporte de insumos', () => {
  test.beforeEach(async ({ api, loginAs }) => {
    await loginAs(['administrador'])
    stubReports(api)
  })

  test('dice cuántos se usaron, cuánto rindieron y qué hay en la máquina', async ({ page }) => {
    await page.goto('/analytics/consumables')

    const summary = page.locator('section', { hasText: 'Consumo y rendimiento' }).locator('table')
    const saw = summary.getByRole('row', { name: /Sierra/ })
    await expect(saw).toContainText('3 (1 nueva, 2 afiladas)')
    await expect(saw).toContainText(/1\.180\sm · 79,5 tableros/)
    // New against sharpened, and the one that broke kept out of the average.
    await expect(saw).toContainText(/nueva 1\.420\sm · afilada 940\sm · 1 dañada aparte/)
    await expect(summary.getByRole('row', { name: /Goma/ })).toContainText('9,5 kg en 2 cargas')
    await expect(summary.getByRole('row', { name: /Goma/ })).toContainText(/213\sm por kg/)
    // Nothing came off yet: no yield to state.
    await expect(summary.getByRole('row', { name: /Incisor/ })).toContainText('1 (1 nuevo)')

    const lives = page.locator('section', { hasText: 'Vida de cada insumo' }).locator('table')
    await expect(lives.getByRole('row').nth(1)).toContainText('En uso')
    await expect(lives.getByRole('row', { name: /Diente roto/ })).toContainText('Se dañó')
  })

  test('anular un cambio pide el motivo', async ({ page, api }) => {
    api.post(/^\/consumables\/changes\/\d+\/void$/, [])
    await page.goto('/analytics/consumables')

    const lives = page.locator('section', { hasText: 'Vida de cada insumo' }).locator('table')
    await lives
      .getByRole('row', { name: /Diente roto/ })
      .getByRole('button', { name: /Anular/ })
      .click()

    const dialog = page.getByRole('alertdialog', { name: 'Anular cambio de sierra' })
    await expect(dialog).toContainText('deja de contar')
    const confirm = dialog.getByRole('button', { name: 'Anular cambio' })
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('textbox').fill('Se registró por error')
    await confirm.click()

    await expect.poll(() => api.requests('POST', '/consumables/changes/6/void')).toHaveLength(1)
    expect(api.requests('POST', '/consumables/changes/6/void')[0]?.postDataJSON()).toEqual({
      reason: 'Se registró por error',
    })
    await expect(dialog).toBeHidden()
  })

  test('un cambio que nadie registró se ingresa con su fecha', async ({ page, api }) => {
    api.post(CHANGES, [])
    await page.goto('/analytics/consumables')

    await page.getByRole('button', { name: 'Registrar cambio pasado' }).click()
    const dialog = page.getByRole('dialog', { name: 'Registrar cambio pasado' })
    const submit = dialog.getByRole('button', { name: 'Registrar cambio' })
    // Which branch and when: nothing goes out without the two.
    await expect(submit).toBeDisabled()
    await dialog.getByLabel('Sucursal').selectOption({ label: 'Norte' })
    await dialog.getByLabel('Insumo').selectOption({ label: 'Incisor' })
    await dialog.getByLabel('Qué se montó').selectOption({ label: 'Nuevo' })
    await dialog.getByLabel('Fecha y hora del cambio').fill('2026-09-01T08:30')
    await submit.click()

    await expect.poll(() => api.requests('POST', CHANGES)).toHaveLength(1)
    const sent = api.requests('POST', CHANGES)[0]?.postDataJSON() as Record<string, unknown>
    expect(sent).toMatchObject({ type: 'scoring_blade', branchId: 2, condition: 'new' })
    // 08:30 on the shop's clock: the browser runs in America/Guayaquil (UTC-5), whatever zone
    // the runner is in. Read off Node's own clock, this was five hours off on CI.
    expect(sent.changedAt).toBe('2026-09-01T13:30:00.000Z')
    await expect(dialog).toBeHidden()
  })
})
