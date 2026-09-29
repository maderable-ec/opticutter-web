import type { OptimizePayload } from 'src/features/optimizer/types'
import { unplacedOptimizeResponse } from './fixtures/data'
import { BOARD, boardMaterial, seedOptimizer, stubOptimizer } from './fixtures/scenarios'
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

  const footer = page.locator('.wizard-footer')
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

  // Cotización stays locked, in the trail and in the footer, with the same reason.
  const reason = 'Una pieza no entra en el material'
  const quoteStep = page.getByRole('button', { name: 'Cotización', exact: true })
  await expect(quoteStep).toBeDisabled()
  await expect(quoteStep).toHaveAttribute('title', reason)

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
