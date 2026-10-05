import { stubReports } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// The reports: the window they look through lives in the URL and scopes every block, a table sorts
// from the keyboard, and on a phone the filters wait in a sheet. The period rules are unit-tested in
// src/features/analytics/reportFilters.test.ts.

const param = (url: string, key: string) => new URL(url).searchParams.get(key)

test('un período elegido queda en la URL y lo lee cada bloque', async ({ page, api, loginAs }) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/summary')
  await expect(page.getByText('$18.450,30')).toBeVisible()
  // The repeated «Operación y eficiencia» block is gone, and with it its request: an unstubbed
  // `/analytics/operations` would fail the test at teardown.
  await expect(page.getByRole('button', { name: '30 días' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByRole('button', { name: '7 días' }).click()
  await expect(page).toHaveURL(/\/analytics\/summary\?period=7d$/)
  await expect(page.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true')

  // Every block re-asks for the same seven days.
  for (const path of [
    '/analytics/summary',
    '/analytics/timeseries',
    '/analytics/breakdown/status',
  ]) {
    await expect
      .poll(() => api.requests('GET', path).map((r) => param(r.url(), 'from')))
      .toHaveLength(2)
    const [before, after] = api.requests('GET', path).map((r) => param(r.url(), 'from') ?? '')
    expect(after, path).not.toBe(before)
  }

  // A reload lands on the same window.
  await page.reload()
  await expect(page.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true')
})

test('la productividad se ordena por columna desde el teclado', async ({ page, api, loginAs }) => {
  await loginAs(['administrador'])
  stubReports(api)

  await page.goto('/analytics/productivity')
  const table = page.locator('.list-table')
  const firstUser = table.locator('tbody tr').first().locator('td').first()
  await expect(firstUser).toContainText('Carlos Guamán')

  const ingresos = table.getByRole('button', { name: 'Ingresos' })
  await ingresos.focus()
  await page.keyboard.press('Enter')
  await expect(table.getByRole('columnheader', { name: 'Ingresos' })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await expect(firstUser).toContainText('Andrea Palacios')

  await page.keyboard.press('Enter')
  await expect(table.getByRole('columnheader', { name: 'Ingresos' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
})

test(
  'en el celular los filtros esperan en una hoja y se aplican al tocarlos',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubReports(api)

    await page.goto('/analytics/summary')
    await expect(page.getByText('Últimos 30 días · Todas las sucursales')).toBeVisible()

    await page.getByRole('button', { name: /Filtros/ }).click()
    const sheet = page.locator('.offcanvas.show')
    await sheet.getByRole('combobox', { name: 'Sucursal' }).selectOption({ label: 'Norte' })
    await sheet.getByRole('button', { name: 'Listo' }).click()

    await expect(page).toHaveURL(/\/analytics\/summary\?branchId=2$/)
    await expect(page.getByText('Últimos 30 días · Norte')).toBeVisible()
    await expect
      .poll(() =>
        api.requests('GET', '/analytics/summary').some((r) => param(r.url(), 'branchId') === '2'),
      )
      .toBe(true)
  },
)
