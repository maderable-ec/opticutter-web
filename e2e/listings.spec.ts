import type { MockApi } from './fixtures/api'
import { boardProduct, branch, client, edgeBandingProduct, preOrderSummary } from './fixtures/data'
import { stubOptimizer } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// The listings on a phone (@movil): a card per record instead of a table that scrolled sideways,
// the filter sheet on every catalog, and the record's form on the whole screen. From `md` the
// table stays, with the record's code as a link a keyboard can reach.

// The quotes listing, with what its filter panel reads (the branch and client pickers).
const stubPreorders = (api: MockApi) => {
  api.list('/branches/', [branch()])
  api.list('/clients/', [client()])
  api.list('/preorders/', [preOrderSummary()])
}

// The catalog answers 42 products, 12 of them boards: the sheet's count has to follow the draft.
const stubProducts = (api: MockApi) => {
  api.list('/product-families/', [])
  api.list('/products/', [boardProduct(), edgeBandingProduct()], (req) =>
    new URL(req.url()).searchParams.get('type') === 'board' ? 12 : 42,
  )
}

test(
  'en el celular, la hoja de filtros del catálogo cuenta antes de aplicar y aplica de una vez',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubProducts(api)

    await page.goto('/products')
    await expect(page.locator('.list-cards .list-card').first()).toBeVisible()
    await page.getByRole('button', { name: 'Filtros' }).click()

    const sheet = page.locator('.filter-sheet')
    await expect(sheet.getByRole('button', { name: 'Ver 42 productos' })).toBeVisible()
    // A tick edits the draft: the count follows it, the list behind does not move.
    await sheet.getByRole('checkbox', { name: 'Tablero' }).check()
    await expect(sheet.getByRole('button', { name: 'Ver 12 productos' })).toBeVisible()
    await expect(page).not.toHaveURL(/type=board/)

    await sheet.getByRole('button', { name: 'Ver 12 productos' }).click()
    await expect(page).toHaveURL(/type=board/)
    await expect(page).not.toHaveURL(/filtros=1/)
    await expect(sheet).toBeHidden()
    await expect(page.locator('.filter-chip', { hasText: 'Tablero' })).toBeVisible()
  },
)

test(
  'en el celular, un cliente se lee en su tarjeta y se edita a pantalla completa',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    api.list('/clients/', [client({ email: 'ana@correo.ec' })])

    await page.goto('/clients')
    const card = page.locator('.list-cards .list-card', { hasText: 'Ana Pérez' })
    await expect(card).toContainText('0991234567')
    await expect(card).toContainText('ana@correo.ec')

    await card.click()
    const dialog = page.locator('.modal.show .modal-dialog')
    await expect(dialog).toHaveClass(/modal-fullscreen-md-down/)
    await expect(dialog.getByLabel('Teléfono')).toHaveValue('0991234567')
    await expect(dialog.getByLabel('Teléfono')).toHaveAttribute('type', 'tel')
  },
)

test(
  'en el celular, el listado no repite «Nueva cotización»: está en la barra de abajo',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubPreorders(api)
    stubOptimizer(api)

    await page.goto('/preorders')
    await expect(page.locator('.list-cards .list-card').first()).toContainText('PRE-000123')
    await expect(page.getByRole('button', { name: 'Nueva cotización' })).toBeHidden()
    // «Cotizar» is the bar's raised disc: named, with no label under it.
    const cotizar = page
      .getByRole('navigation', { name: 'Navegación rápida' })
      .getByRole('link', { name: 'Cotizar' })
    await expect(cotizar).toBeVisible()
    await expect(cotizar).toHaveText('', { useInnerText: true })
    await cotizar.click()
    await expect(page).toHaveURL(/\/optimizer$/)
  },
)

test('el código de una cotización es un enlace a su ficha, al alcance del teclado', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['vendedor'], { user: { branchId: 1 } })
  stubPreorders(api)

  await page.goto('/preorders')
  const link = page.locator('.list-table').getByRole('link', { name: 'PRE-000123' })
  await expect(link).toHaveAttribute('href', '/preorders/123')
  await link.focus()
  await expect(link).toBeFocused()
})

test(
  'en el celular, la hoja de filtros sube desde abajo y Esc la cierra sin aplicar',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubProducts(api)

    await page.goto('/products')
    await page.getByRole('button', { name: 'Filtros' }).click()
    // The same sheet as the reports' filters and the menu, named by its title, holding the focus.
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toHaveClass(/offcanvas-bottom/)
    await expect(sheet).toBeFocused()
    await sheet.getByRole('checkbox', { name: 'Tablero' }).check()

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(page).not.toHaveURL(/filtros=1|type=board/)
    await expect(page.locator('.filter-chip')).toHaveCount(0)
  },
)

// The families of the catalog: one that coordinates, as the listing and its dialog read it.
const cashmere = {
  id: 1,
  name: 'Cashmere',
  description: null,
  boardCount: 1,
  edgeBandingCount: 1,
  hasNoBoards: false,
  hasNoEdgeBandings: false,
  uncoveredThicknesses: [],
  aliases: ['CSH'],
  missingAliasCount: 0,
}

test('en Familias, la fila abre la familia y la familia se edita desde ahí', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  api.list('/product-families/', [cashmere])
  api.get('/product-families/1', {
    ...cashmere,
    boards: [boardProduct()],
    edgeBandings: [edgeBandingProduct({ alias: 'CSH' })],
  })
  api.put('/product-families/1', { ...cashmere, name: 'Cashmere Gris' })

  await page.goto('/product-families')
  const row = page.locator('.list-table tbody tr', { hasText: 'Cashmere' })
  // Beside the row only delete, as in the rest of the catalog: editing is inside the family.
  await expect(row.getByRole('button', { name: 'Editar Cashmere' })).toHaveCount(0)
  await expect(row.getByRole('button', { name: 'Eliminar Cashmere' })).toBeVisible()

  await row.click()
  const family = page.getByRole('dialog', { name: 'Cashmere' })
  await expect(family.getByRole('heading', { level: 3, name: /Tableros/ })).toBeVisible()
  await expect(family).toContainText('Coordinada')

  await family.getByRole('button', { name: 'Editar' }).click()
  const form = page.getByRole('dialog', { name: 'Editar familia' })
  await form.getByLabel('Nombre del diseño').fill('Cashmere Gris')
  await form.getByRole('button', { name: 'Guardar' }).click()

  // Saved, it goes back to the family's contents.
  await expect(page.getByRole('dialog', { name: 'Cashmere' })).toBeVisible()
  expect(api.requests('PUT', '/product-families/1')[0]?.postDataJSON()).toEqual({
    name: 'Cashmere Gris',
    description: null,
  })
})
