import { describe, expect, it } from 'vitest'

import { creditBalance, paymentDraft, standingPayments } from './payments'
import type { OrderPayment } from './types'

describe('the payment form', () => {
  it('adds the two ways money arrives and says what is left', () => {
    expect(paymentDraft('50', '20.5', 120)).toEqual({
      cash: 50,
      transfer: 20.5,
      entered: 70.5,
      remaining: 49.5,
      exceeds: false,
    })
  })

  it('reads an empty or meaningless input as nothing', () => {
    const draft = paymentDraft('', 'abc', 80)
    expect(draft.entered).toBe(0)
    expect(draft.remaining).toBe(80)
    expect(paymentDraft('-5', '', 80).entered).toBe(0)
  })

  it('leaves nothing once the balance is covered, to the cent', () => {
    expect(paymentDraft('79.995', '', 80).remaining).toBe(0)
    expect(paymentDraft('40', '40', 80)).toMatchObject({ remaining: 0, exceeds: false })
    // 0.1 + 0.2 is not 0.3 in floating point; the balance must not be left owing a fraction.
    expect(paymentDraft('0.1', '0.2', 0.3)).toMatchObject({ remaining: 0, exceeds: false })
  })

  it('flags a payment over what is owed before the server rejects it', () => {
    expect(paymentDraft('80.02', '', 80).exceeds).toBe(true)
    // A cent over is rounding, not an overpayment.
    expect(paymentDraft('80.01', '', 80).exceeds).toBe(false)
  })
})

describe('what an order owes', () => {
  it('is the server’s balance, and nothing under a cent', () => {
    expect(creditBalance({ creditBalance: 30 })).toBe(30)
    expect(creditBalance({ creditBalance: 0.004 })).toBe(0)
    // An API from before the field: nothing is known to be owed.
    expect(creditBalance({})).toBe(0)
  })

  it('leaves the voided payments out of every sum', () => {
    const payment = (overrides: Partial<OrderPayment>): OrderPayment => ({
      id: 1,
      method: 'cash',
      amount: 50,
      paidAt: '2026-10-12T15:00:00Z',
      ...overrides,
    })
    const standing = standingPayments([
      payment({ id: 1 }),
      payment({ id: 2, voidedAt: '2026-10-12T16:00:00Z' }),
    ])
    expect(standing.map((p) => p.id)).toEqual([1])
    expect(standingPayments(undefined)).toEqual([])
  })
})
