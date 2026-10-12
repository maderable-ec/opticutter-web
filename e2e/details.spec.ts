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

// The credit an order was sold on: what came in since, what is left, and the two moments it gets
// paid — on delivery, or whenever the client comes back.
const onCredit = (overrides: Parameters<typeof order>[0] = {}) =>
  order({
    status: 'finished',
    total: 120,
    paymentCashAmount: 40,
    paymentCreditAmount: 80,
    payments: [],
    creditCollected: 0,
    creditBalance: 80,
    ...overrides,
  })

test('despachar una orden con saldo cobra en el mismo paso, o deja dicho quién lo autoriza', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['vendedor'], { user: { branchId: 1 } })
  stubOrder(api)
  api.get('/orders/41', onCredit())
  api.patch('/orders/41/status', onCredit({ status: 'dispatched', creditBalance: 30 }))

  await page.goto('/orders/41')
  await expect(page.getByText('Crédito pendiente: $80,00')).toBeVisible()
  await page.getByRole('button', { name: 'Despachar' }).click()

  const dialog = page.getByRole('dialog', { name: 'Despachar ORD-000041' })
  await expect(dialog.locator('.credit-balance')).toContainText('$80,00')
  // Nothing typed: the order can go out, but with the balance on the button and a note owed.
  const withBalance = dialog.getByRole('button', { name: 'Despachar con saldo de $80,00' })
  await expect(withBalance).toBeDisabled()

  await dialog.getByRole('button', { name: 'Todo efectivo' }).click()
  await expect(dialog.getByText('Con esto el saldo queda en cero.')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cobrar y despachar' })).toBeEnabled()

  // A partial payment leaves a balance: the button says how much, and waits for the note.
  await dialog.getByLabel('Efectivo (USD)').fill('50')
  await expect(dialog.getByText('Queda pendiente: $30,00')).toBeVisible()
  const partial = dialog.getByRole('button', { name: 'Despachar con saldo de $30,00' })
  await expect(partial).toBeDisabled()
  await dialog.getByLabel(/Quién autoriza/).fill('Autoriza gerencia, paga el viernes')
  await partial.click()

  const [sent] = api.requests('PATCH', '/orders/41/status')
  expect(sent?.postDataJSON()).toEqual({
    status: 'dispatched',
    note: 'Autoriza gerencia, paga el viernes',
    payment: { cashAmount: 50 },
  })
  await expect(dialog).toBeHidden()
})

test('una orden despachada todavía recibe abonos, y la lista dice qué se pagó y cuándo', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubOrder(api)
  const paid = {
    id: 7,
    method: 'cash' as const,
    amount: 50,
    paidAt: minutesAgo(60 * 26),
    receivedByLabel: 'Andrea Palacios',
  }
  const before = onCredit({
    status: 'dispatched',
    payments: [paid],
    creditCollected: 50,
    creditBalance: 30,
  })
  const transfer = { ...paid, id: 8, method: 'transfer' as const, amount: 30, note: 'Transf. 4471' }
  let settled = false
  api.get('/orders/41', () =>
    settled
      ? onCredit({
          status: 'dispatched',
          payments: [paid, transfer],
          creditCollected: 80,
          creditBalance: 0,
        })
      : before,
  )
  api.post('/orders/41/payments', () => {
    settled = true
    return before
  })

  await page.goto('/orders/41')
  const ledger = page.locator('.credit-ledger')
  await expect(ledger).toContainText('$50,00')
  await expect(ledger).toContainText('Efectivo')
  await expect(ledger).toContainText('Andrea Palacios')
  await expect(ledger).toContainText('Crédito pendiente: $30,00')
  // Only the admin takes a payment back off the books.
  await expect(ledger.getByRole('button', { name: 'Anular' })).toBeVisible()

  await ledger.getByRole('button', { name: 'Registrar abono' }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar abono · ORD-000041' })
  // More than is owed is said before the server says it.
  await dialog.getByLabel('Transferencia (USD)').fill('45')
  await expect(dialog.getByText('Excede el saldo en $15,00')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Registrar abono' })).toBeDisabled()

  await dialog.getByRole('button', { name: 'Todo transferencia' }).click()
  await dialog.getByLabel('Nota (opcional)').fill('Transf. 4471')
  await dialog.getByRole('button', { name: 'Registrar abono' }).click()

  const [sent] = api.requests('POST', '/orders/41/payments')
  expect(sent?.postDataJSON()).toEqual({ transferAmount: 30, note: 'Transf. 4471' })
  await expect(ledger).toContainText('Crédito pagado')
  await expect(ledger.getByRole('button', { name: 'Registrar abono' })).toHaveCount(0)
})
