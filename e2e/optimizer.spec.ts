import type { OptimizePayload } from 'src/features/optimizer/types'
import type { PreOrderCreate } from 'src/features/preorders/types'
import {
  branch,
  client,
  minutesAgo,
  planResponse,
  preOrder,
  stockCheck,
  unplacedOptimizeResponse,
} from './fixtures/data'
import {
  BOARD,
  TAPE,
  boardMaterial,
  piece,
  seedOptimizer,
  stubOptimizer,
} from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

test.beforeEach(async ({ api, loginAs }) => {
  await loginAs(['vendedor'], { user: { branchId: 1 } })
  stubOptimizer(api)
})

// Pre-order 157 went out with five pieces that did not fit, behind a yellow warning nobody read.
// Since then a piece left out BLOCKS: the wizard never reaches Cotización and says why.
test('una pieza que no entra cierra Cotización y dice por qué', async ({ page, api }) => {
  const material = boardMaterial()
  await seedOptimizer(page, [material])
  api.post(
    '/optimize/',
    unplacedOptimizeResponse([
      {
        materialKey: material.uid,
        label: 'Lateral',
        height: 3000,
        width: 600,
        quantity: 1,
        materialName: BOARD.name,
        usableHeight: 2420,
        usableWidth: 2130,
        reason: 'larger_than_sheet',
      },
    ]),
  )

  await page.goto('/optimizer')
  await page.getByPlaceholder(/720×400×4/).fill('3000x600x1 Lateral')
  await page.keyboard.press('Enter')

  const footer = page.locator('.action-bar')
  await footer.getByRole('button', { name: /Optimización/ }).click()

  // The search ran with the piece as typed…
  await expect.poll(() => api.requests('POST', '/optimize/').length).toBe(1)
  const payload = api.requests('POST', '/optimize/')[0]?.postDataJSON() as OptimizePayload
  expect(payload.requirements).toEqual([
    expect.objectContaining({ height: 3000, width: 600, quantity: 1 }),
  ])

  // …and the answer is an error that names the piece and the useful area.
  const alert = page.locator('.alert-danger')
  await expect(alert).toContainText('Lateral')
  await expect(alert).toContainText('más grande que el área útil (2420×2130 mm)')

  // Cotización stays locked, in the trail and in the footer, with the same reason. The trail's
  // step answers a click with it too: a `title` is never shown on a phone.
  const reason = 'Una pieza no entra en el material'
  const quoteStep = page.getByRole('button', { name: 'Cotización', exact: true })
  await expect(quoteStep).toBeDisabled()
  await expect(quoteStep).toHaveAttribute('title', reason)
  // `force`: Playwright will not click an `aria-disabled` control, and a finger will.
  await quoteStep.click({ force: true })
  await expect(page.getByRole('status')).toContainText(`Cotización: ${reason}.`)

  await footer.getByRole('button', { name: /Costos/ }).click()
  await expect(footer.getByRole('button', { name: /Cotización/ })).toBeDisabled()
  await expect(footer).toContainText(reason)
})

// The Fullscreen API only paints the element it was given: a modal portalled to <body> would open
// behind it, invisible. Every modal of the optimizer mounts inside the workspace instead.
test('en pantalla completa, el modal del material se abre dentro del workspace', async ({
  page,
}) => {
  await page.goto('/optimizer')
  await page.locator('.optimizer-workspace').evaluate((el) => el.requestFullscreen())
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)

  await page.getByRole('button', { name: 'Definir material' }).click()
  await expect(page.locator('.optimizer-workspace .modal.show')).toBeVisible()
})

// «Crear cotización» lives in the pinned bar, next to the total, like every step's next move. It
// says what it is waiting for until the form has it.
test('la cotización se crea desde la barra fija', async ({ page, api }) => {
  const banded = { ...piece(720, 560, 2, 'Lateral', { left: true }) }
  await seedOptimizer(
    page,
    [boardMaterial()],
    [{ ...banded, edgeBanding: { ...banded.edgeBanding, productId: TAPE.id } }],
  )
  api.post('/optimize/', planResponse())
  api.list('/clients/', [client()])
  api.post('/inventory/stock-check', stockCheck())
  api.post('/preorders/', preOrder())
  // The pre-order page the seller lands on.
  api.get('/preorders/123', preOrder())
  api.get('/preorders/123/review-link', {
    status: 'active',
    createdAt: minutesAgo(60),
    expiresAt: minutesAgo(-60 * 24 * 5),
    usedAt: null,
  })

  await page.goto('/optimizer?step=costs')
  const footer = page.locator('.action-bar')
  await footer.getByRole('button', { name: /Cotización/ }).click()

  const create = footer.getByRole('button', { name: 'Crear cotización' })
  await expect(create).toBeDisabled()
  await expect(footer).toContainText('Falta elegir el cliente.')
  await expect(footer).toContainText('Total')

  await page.getByRole('button', { name: /Ana Pérez/ }).click()
  await expect(create).toBeEnabled()
  await create.click()

  await expect(page).toHaveURL(/\/preorders\/123$/)
  const sent = api.requests('POST', '/preorders/')[0]?.postDataJSON() as PreOrderCreate
  expect(sent).toMatchObject({ clientId: 1, priceLevel: 1, source: 'dashboard' })
})

// On a phone the despiece is a list to read, and a piece is corrected in a sheet. The edits are the
// grid's own (`usePiecesEditor`), so they reach the search exactly as typed.
test('en el celular, una pieza se corrige en su hoja', { tag: '@movil' }, async ({ page, api }) => {
  await seedOptimizer(page, [boardMaterial()], [piece(720, 560, 2, 'Lateral')])
  api.post('/optimize/', planResponse())

  await page.goto('/optimizer')
  // A new piece from the quick-entry line, by its button rather than a key a phone hides.
  await page.getByPlaceholder(/720×400×4/).fill('400x300x1 Repisa')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()

  const rows = page.locator('.piece-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(1)).toContainText('Repisa')
  await expect(rows.nth(1)).toContainText('400 × 300 mm')

  await rows.first().click()
  const sheet = page.getByRole('dialog', { name: /Pieza #1/ })
  await expect(sheet).toBeVisible()
  await sheet.getByLabel('Cant.').fill('3')
  await sheet.getByLabel('Canto', { exact: true }).selectOption('2L')
  await sheet.getByRole('button', { name: 'Canto duro' }).click()
  // What the grid keeps for the keyboard is said, not hidden.
  await expect(sheet).toContainText('se editan en la computadora')
  await sheet.getByRole('button', { name: 'Listo' }).click()
  await expect(sheet).toBeHidden()

  await expect(rows.first()).toContainText('×3')
  await expect(rows.first()).toContainText('2L CD')

  // Duplicar and Eliminar act on the piece the sheet is open on.
  await rows.nth(1).click()
  await page
    .getByRole('dialog', { name: /Pieza #2/ })
    .getByRole('button', { name: 'Eliminar' })
    .click()
  await expect(rows).toHaveCount(1)

  await page
    .locator('.action-bar')
    .getByRole('button', { name: /Optimización/ })
    .click()
  await expect.poll(() => api.requests('POST', '/optimize/').length).toBe(1)
  const payload = api.requests('POST', '/optimize/')[0]?.postDataJSON() as OptimizePayload
  expect(payload.requirements).toEqual([
    expect.objectContaining({
      height: 720,
      width: 560,
      quantity: 3,
      edgeBanding: expect.objectContaining({
        productId: Number(TAPE.id),
        sides: expect.arrayContaining(['left', 'right']),
      }),
    }),
  ])
})

// A question asked from inside a dialog opens over it and owns the keyboard: Tab stays in the
// question, and Esc closes the question alone. CoreUI listens for Esc in every open dialog at once,
// and its focus trap pulled the focus back into the dialog underneath.
test('borrar un borrador pregunta encima de Borradores, que sigue abierto', async ({
  page,
  api,
}) => {
  api.list('/optimization-drafts/', [
    {
      id: 7,
      name: 'Cocina Pérez',
      clientId: null,
      branch: branch(),
      createdAt: minutesAgo(90),
      updatedAt: minutesAgo(30),
    },
  ])
  api.delete('/optimization-drafts/7', null)

  await page.goto('/optimizer')
  await page.getByRole('button', { name: 'Acciones' }).click()
  await page.getByRole('button', { name: 'Borradores…' }).click()
  const drafts = page.getByRole('dialog', { name: 'Borradores guardados' })
  const remove = drafts.getByRole('button', { name: 'Eliminar borrador' })
  const question = page.getByRole('alertdialog', { name: 'Eliminar borrador' })

  await remove.click()
  await expect(question).toContainText('Cocina Pérez')
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    await expect(question.locator(':focus')).toHaveCount(1)
  }
  await page.keyboard.press('Escape')
  await expect(question).toBeHidden()
  await expect(drafts).toBeVisible()
  expect(api.requests('DELETE', '/optimization-drafts/7')).toHaveLength(0)

  await remove.click()
  await question.getByRole('button', { name: 'Eliminar' }).click()
  await expect.poll(() => api.requests('DELETE', '/optimization-drafts/7').length).toBe(1)
  await expect(question).toBeHidden()
  await expect(drafts).toBeVisible()
})
