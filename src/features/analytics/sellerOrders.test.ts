import { describe, expect, it } from 'vitest'

import { invoiceLabel, orderDate, paymentBreakdown } from './sellerOrders'
import type { SellerOrder } from './types'

const order = (overrides: Partial<SellerOrder> = {}): SellerOrder => ({
  orderId: 50,
  orderCode: 'ORD-000050',
  clientName: 'Carpintería Andes',
  branchName: 'Sucúa',
  createdAt: new Date(2026, 9, 6, 10, 0).toISOString(),
  paidAt: new Date(2026, 9, 6, 16, 0).toISOString(),
  day: '2026-10-06',
  cash: 50,
  transfer: 0,
  credit: 0,
  total: 50,
  invoice: '001-002-000123',
  ...overrides,
})

describe('a sale of the seller', () => {
  it('names only the payment methods used', () => {
    expect(paymentBreakdown(order())).toBe('efectivo $50,00')
    expect(paymentBreakdown(order({ cash: 50, transfer: 10, credit: 40 }))).toBe(
      'efectivo $50,00 · transferencia $10,00 · crédito $40,00',
    )
  })

  it('says the order’s date only when it is not the day of the payment', () => {
    expect(orderDate(order())).toBeUndefined()
    expect(orderDate(order({ createdAt: new Date(2026, 8, 28, 10, 0).toISOString() }))).toBe(
      'orden del 28/09/2026',
    )
  })

  it('gives the invoice to cross-check, or says there is none', () => {
    expect(invoiceLabel(order())).toBe('factura 001-002-000123')
    expect(invoiceLabel(order({ invoice: null }))).toBe('sin factura')
  })
})
