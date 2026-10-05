import type { MockApi } from './fixtures/api'
import { branch, cuttingPlan, minutesAgo, order, preOrder, stockCheck } from './fixtures/data'
import { stubOptimizer } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// The quote and the order detail on a phone (@movil): each page in parts, taking turns under a
// sticky control, with the cut list readable as cards. From `md` both stay the single surface they
// were, which the desktop test checks.

const stubOrder = (api: MockApi) => {
  api.list('/branches/', [branch()])
  api.get('/orders/41', order())
  api.get('/orders/41/cutting-plan', cuttingPlan())
  api.get('/orders/41/attachments', [])
  api.post('/inventory/stock-check', stockCheck())
}

const stubQuote = (api: MockApi) => {
  stubOptimizer(api)
  api.get('/preorders/123', preOrder())
  api.post('/inventory/stock-check', stockCheck())
  api.get('/preorders/123/review-link', {
    status: 'active',
    createdAt: minutesAgo(60),
    expiresAt: minutesAgo(-60 * 24 * 5),
    usedAt: null,
  })
}

test(
  'en el celular, la orden se lee por partes: trabajo, cobro e historial',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubOrder(api)

    await page.goto('/orders/41')
    const parts = page.getByRole('tablist', { name: 'Partes de la orden' })
    const cutList = page.locator('.cut-list')
    await expect(parts.getByRole('tab', { name: 'Resumen' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByText('Forma de pago')).toBeVisible()
    await expect(cutList).toBeHidden()

    // Trabajo: the cut list is the work order, in the shop's words, one card per piece.
    await parts.getByRole('tab', { name: 'Trabajo' }).click()
    await expect(page).toHaveURL(/view=work/)
    const lateral = cutList.locator('.cut-piece', { hasText: 'Lateral' })
    await expect(lateral).toContainText('720 × 560 mm')
    await expect(lateral).toContainText('1L1C CS')
    await expect(lateral).toContainText('Abis B2')
    await expect(page.getByText('Forma de pago')).toBeHidden()

    await parts.getByRole('tab', { name: 'Cobro' }).click()
    await expect(page.getByText('Forma de pago')).toBeVisible()
    await expect(cutList).toBeHidden()

    // Historial: the moves inline, with their dates — which is why the header drops its own.
    await parts.getByRole('tab', { name: 'Historial' }).click()
    await expect(page.locator('.history-entry')).toHaveCount(3)
    await expect(page.getByText(/^Creada /)).toBeHidden()
  },
)

test(
  'en el celular, la cotización muestra sus piezas y «Otra alternativa» pasa al ⋮',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubQuote(api)

    await page.goto('/preorders/123')
    const footer = page.locator('.action-bar')
    await expect(footer.getByRole('button', { name: /Otra alternativa/ })).toBeHidden()
    await page.getByRole('button', { name: 'Acciones' }).click()
    await expect(page.getByRole('button', { name: /Otra alternativa/ })).toBeVisible()
    await page.keyboard.press('Escape')

    await page
      .getByRole('tablist', { name: 'Partes de la cotización' })
      .getByRole('tab', { name: 'Piezas' })
      .click()
    await expect(page.locator('.cut-piece', { hasText: 'Mesón' })).toContainText('2400 × 600 mm')
    await expect(page.getByRole('button', { name: 'Editar despiece' })).toBeVisible()
  },
)

test('en la computadora, la orden sigue siendo una sola superficie', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubOrder(api)

  await page.goto('/orders/41?view=billing')
  await expect(page.getByRole('tablist', { name: 'Partes de la orden' })).toBeHidden()
  // Every part at once, whatever the URL says: the cut list behind its row, the money, the dates.
  await expect(page.getByRole('button', { name: 'Ver lista' })).toBeVisible()
  await expect(page.getByText('Forma de pago')).toBeVisible()
  await expect(page.getByText(/^Creada /)).toBeVisible()
  await expect(page.locator('.cut-list')).toBeHidden()
})
