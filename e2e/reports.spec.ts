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
  // The live state, the period's total and one column per branch plus the total.
  await expect(page.locator('.production-status')).toContainText('Cortando')
  await expect(page.locator('.production-status')).toContainText('Detenida')
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
