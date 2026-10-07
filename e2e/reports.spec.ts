import { stubReports } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// The reports: the window they look through lives in the URL and scopes every block, the Resumen
// compares every branch, Productividad is one table per team, and on a phone the filters wait in a
// sheet. The period rules are unit-tested in src/features/analytics/reportFilters.test.ts and the
// comparison's leader in comparison.test.ts.

const param = (url: string, key: string) => new URL(url).searchParams.get(key)

test('el Resumen compara las sucursales en el período, este mes por defecto', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/summary')
  await expect(page.getByRole('button', { name: 'Este mes' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // The live state (the saw, the banding and the additional work), the period's total and one
  // column per branch plus the total.
  const live = page.locator('.production-status')
  await expect(live).toContainText('Cortando')
  await expect(live).toContainText('Detenida')
  await expect(live).toContainText('Canteando')
  await expect(live).toContainText('2 órdenes listas')
  await expect(live).toContainText('sin adicionales registrados')
  await expect(page.locator('.stat-tile').first()).toContainText('$18.450,80')
  const table = page.locator('.comparison-table')
  await expect(table.locator('thead th')).toHaveText(['Indicador', 'Matriz', 'Norte', 'Total'])
  // Matriz sold more: its «Total vendido» carries the leader's mark.
  const sold = table.getByRole('row', { name: /Total vendido/ })
  await expect(sold.locator('.is-lead')).toContainText('$12.100,50')
  // The comparison IS every branch: no branch filter here.
  await expect(page.getByRole('combobox', { name: 'Sucursal' })).toHaveCount(0)

  await page.getByRole('button', { name: '7 días' }).click()
  await expect(page).toHaveURL(/\/analytics\/summary\?period=7d$/)
  await expect
    .poll(() =>
      api.requests('GET', '/analytics/branch-comparison').map((r) => param(r.url(), 'from')),
    )
    .toHaveLength(2)
  const [before, after] = api
    .requests('GET', '/analytics/branch-comparison')
    .map((r) => param(r.url(), 'from') ?? '')
  expect(after).not.toBe(before)

  // A reload lands on the same window.
  await page.reload()
  await expect(page.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true')
})

test('Producción muestra la jornada por día y la sucursal acota el detalle', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/production')
  await expect(page.locator('.comparison-table')).toContainText('Horas paradas')
  await expect(page.locator('.production-stops')).toContainText('2h 13m')

  await page.getByRole('combobox', { name: 'Sucursal' }).selectOption({ label: 'Norte' })
  await expect(page).toHaveURL(/\/analytics\/production\?branchId=2$/)
  await expect
    .poll(() =>
      api.requests('GET', '/analytics/production').some((r) => param(r.url(), 'branchId') === '2'),
    )
    .toBe(true)
  // The comparison stays every branch.
  expect(
    api.requests('GET', '/analytics/branch-comparison').every((r) => !param(r.url(), 'branchId')),
  ).toBe(true)
})

test('la productividad es una tabla por equipo y se ordena desde el teclado', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/productivity')
  const table = page.locator('.list-table')
  const firstUser = table.locator('tbody tr').first().locator('td').first()
  await expect(firstUser).toContainText('Andrea Palacios')

  const total = table.getByRole('button', { name: 'Total', exact: true })
  await total.focus()
  await page.keyboard.press('Enter')
  await expect(table.getByRole('columnheader', { name: 'Total', exact: true })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await page.keyboard.press('Enter')
  await expect(firstUser).toContainText('Usuario E2E')

  // Another team is another report, kept in the URL.
  await page.getByRole('button', { name: 'Operadores' }).click()
  await expect(page).toHaveURL(/\/analytics\/productivity\?role=operador$/)
  await expect(firstUser).toContainText('Carlos Guamán')
  expect(api.requests('GET', '/analytics/productivity/operators')).not.toHaveLength(0)
})

test('un operador abre sus tableros, hoja por hoja, para validar la cifra', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/productivity?role=operador')
  // The work of users deleted since is a row of its own, with nothing to open.
  const table = page.locator('.list-table')
  await expect(table.getByRole('row', { name: /Sin usuario/ })).toBeVisible()
  await expect(table.getByRole('button', { name: 'Sin usuario' })).toHaveCount(0)

  await table.getByRole('button', { name: 'Carlos Guamán' }).click()
  await expect(page).toHaveURL(/[?&]user=3(&|$)/)
  const dialog = page.getByRole('dialog', { name: 'Tableros de Carlos Guamán' })
  await expect(dialog).toContainText('Cuentan 1,5 tableros en 2 hojas · 29 piezas marcadas')
  await expect(dialog).toContainText('La cerró Luis Morocho Tenesaca')
  await expect(dialog).toContainText('Faltan 9 piezas')
  await expect(dialog).toContainText('8 de 12 piezas suyas · 4 de Luis Morocho Tenesaca')
  expect(api.requests('GET', /^\/analytics\/productivity\/operators\/3\/boards$/)).not.toHaveLength(
    0,
  )

  // Back closes it: the operator lives in the URL.
  await page.goBack()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/analytics\/productivity\?role=operador$/)
})

test('un vendedor abre sus ventas, con la fecha de cobro y la factura', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/productivity')
  await page.locator('.list-table').getByRole('button', { name: 'Andrea Palacios' }).click()
  await expect(page).toHaveURL(/\/analytics\/productivity\?user=2$/)
  const dialog = page.getByRole('dialog', { name: 'Ventas de Andrea Palacios' })
  await expect(dialog).toContainText('Cobró $380,00 en 2 órdenes')
  await expect(dialog).toContainText('factura 001-002-000123')
  // The sale that moved: confirmed in August, paid in the period.
  await expect(dialog).toContainText('orden del 28/08/2026')
  await expect(dialog).toContainText('efectivo $40,00 · transferencia $20,00 · crédito $120,00')
  await expect(dialog).toContainText('Por cobrar hoy · $75,50')

  // Switching teams closes the detail in the same write.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Canteadores' }).click()
  await expect(page).toHaveURL(/\/analytics\/productivity\?role=canteador$/)
})

test('un canteador abre su trabajo, con lo registrado al cerrar', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/productivity?role=canteador')
  await page.locator('.list-table').getByRole('button', { name: 'Rosa Quizhpi' }).click()
  const dialog = page.getByRole('dialog', { name: 'Trabajo de Rosa Quizhpi' })
  await expect(dialog).toContainText('2 canteadas · 42 m netos · 1 con adicionales · 1 sin tiempo')
  await expect(dialog.locator('.ledger__item')).toHaveCount(3)
  await expect(dialog).toContainText('Sin tiempo')
  await expect(dialog).toContainText('registrada al cerrar')
  await expect(dialog).toContainText('09:00 – 11:00')
  expect(api.requests('GET', /^\/analytics\/productivity\/banders\/5\/orders$/)).not.toHaveLength(0)
})

test(
  'en el celular los filtros esperan en una hoja y se aplican al tocarlos',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubReports(api)

    await page.goto('/analytics/production')
    await expect(page.getByText('Este mes · Todas las sucursales')).toBeVisible()
    await page.getByRole('button', { name: /Filtros/ }).click()
    const sheet = page.locator('.offcanvas.show')
    await sheet.getByRole('combobox', { name: 'Sucursal' }).selectOption({ label: 'Norte' })
    await sheet.getByRole('button', { name: 'Listo' }).click()

    await expect(page).toHaveURL(/\/analytics\/production\?branchId=2$/)
    await expect(page.getByText('Este mes · Norte')).toBeVisible()
    await expect
      .poll(() =>
        api
          .requests('GET', '/analytics/production')
          .some((r) => param(r.url(), 'branchId') === '2'),
      )
      .toBe(true)

    // Resumen compares every branch, so its line names only the period.
    await page.goto('/analytics/summary')
    await expect(page.locator('.report-filters__scope')).toHaveText('Este mes')
  },
)
