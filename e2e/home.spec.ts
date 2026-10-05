import { client } from './fixtures/data'
import { boardMaterial, piece, seedOptimizer, stubHome, stubOptimizer } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// Inicio: every count opens its listing already filtered, the admin moves the whole screen to one
// branch, and «Nueva cotización» never opens yesterday's despiece by surprise. The counting rules
// are unit-tested in src/features/home/home.test.ts.

const AUTOSAVE = 'cutter:optimizer:autosave:v1'

test('cada conteo abre su listado filtrado por la sucursal del vendedor', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['vendedor'], { user: { branchId: 1 } })
  stubHome(api)
  api.list('/clients/', [client()])

  await page.goto('/home')
  const row = page.getByRole('link', { name: /Por cobrar/ })
  await expect(row).toContainText('3')
  await row.click()

  await expect(page).toHaveURL(/\/orders\?status=confirmed&branchId=1$/)
})

test('el admin pasa todo el Inicio a una sucursal', async ({ page, api, loginAs }) => {
  await loginAs(['administrador'])
  stubHome(api, { admin: true })

  await page.goto('/home')
  await expect(page.getByRole('link', { name: /Por despachar/ })).toContainText('1')
  // All branches to start with: the admin has none of their own.
  expect(api.requests('GET', '/orders/').every((r) => !r.url().includes('branchId'))).toBe(true)

  await page.getByRole('combobox', { name: 'Sucursal' }).selectOption({ label: 'Norte' })
  await expect(page).toHaveURL(/\/home\?branchId=2$/)
  await expect(page.getByRole('link', { name: /Por despachar/ })).toHaveAttribute(
    'href',
    '/orders?status=finished&branchId=2',
  )
  await expect
    .poll(() => api.requests('GET', '/orders/').some((r) => r.url().includes('branchId=2')))
    .toBe(true)
})

test.describe('con un despiece abierto en este navegador', () => {
  test.beforeEach(async ({ page, api, loginAs }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubHome(api)
    stubOptimizer(api)
    await seedOptimizer(page, [boardMaterial()], [piece(720, 560, 2, 'Lateral')])
  })

  test('«Continuar despiece» lo retoma', async ({ page }) => {
    await page.goto('/home')
    await page.getByRole('link', { name: 'Continuar despiece · 1 pieza ›' }).click()

    await expect(page).toHaveURL(/\/preorders\/new$/)
    await expect(page.getByText('Restauramos tu trabajo de la sesión anterior.')).toBeVisible()
  })

  test('«Nueva cotización» lo descarta solo si se confirma', async ({ page }) => {
    await page.goto('/home')
    const nueva = page.getByRole('button', { name: 'Nueva cotización' })
    const question = page.getByRole('alertdialog', { name: 'Empezar una cotización nueva' })

    // Esc is a «no», like «Cancelar».
    await nueva.click()
    await expect(question).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(question).toBeHidden()
    await nueva.click()
    await question.getByRole('button', { name: 'Cancelar' }).click()
    await expect(question).toBeHidden()
    await expect(page).toHaveURL(/\/home$/)
    expect(await page.evaluate((key) => localStorage.getItem(key), AUTOSAVE)).not.toBeNull()

    await nueva.click()
    await question.getByRole('button', { name: 'Descartar y empezar' }).click()
    await expect(page).toHaveURL(/\/preorders\/new$/)
    await expect(page.getByPlaceholder(/720×400×4/)).toBeVisible()
    await expect(page.getByText('Restauramos tu trabajo')).toHaveCount(0)
  })

  test('«Nueva cotización» de un listado pregunta lo mismo', async ({ page, api }) => {
    api.list('/orders/', [])
    api.list('/clients/', [])
    await page.goto('/orders')
    await page.getByRole('button', { name: 'Nueva cotización' }).click()
    const question = page.getByRole('alertdialog', { name: 'Empezar una cotización nueva' })
    await question.getByRole('button', { name: 'Descartar y empezar' }).click()

    await expect(page).toHaveURL(/\/preorders\/new$/)
    await expect(page.getByText('Restauramos tu trabajo')).toHaveCount(0)
  })

  test('«Cotizar», el botón del menú, lo retoma sin preguntar', async ({ page, api }) => {
    api.list('/clients/', [])
    await page.goto('/clients')
    await page
      .getByRole('navigation', { name: 'Menú principal' })
      .getByRole('link', { name: 'Cotizar' })
      .click()

    await expect(page).toHaveURL(/\/preorders\/new$/)
    await expect(page.getByText('Restauramos tu trabajo de la sesión anterior.')).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })
})

test(
  'en el celular, «Inicio» abre la barra inferior',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubHome(api)

    await page.goto('/')
    const bar = page.getByRole('navigation', { name: 'Navegación rápida' })
    await expect(bar.getByRole('link').first()).toHaveText('Inicio')
    await expect(bar.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    // Nothing on the screen runs off its right edge (the order cards' long names used to).
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  },
)
