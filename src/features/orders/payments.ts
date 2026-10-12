import type { Order, OrderPayment, PaymentMethod } from './types'

// The credit an order was sold on, and the money that came in since. The balance itself is the
// server's (`creditBalance`: the credit sold less the payments standing); what lives here is the
// arithmetic of the form that registers a payment, and how a payment reads.

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
}

// A balance under a cent is rounding, not a debt — the backend's `BALANCE_TOLERANCE`.
const TOLERANCE = 0.01

const amount = (raw: string): number => {
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

export interface PaymentDraft {
  cash: number
  transfer: number
  entered: number
  // What the order would still owe after this payment; 0 once it is covered.
  remaining: number
  // More than is owed: the server rejects it, so the form says so first.
  exceeds: boolean
}

/** What the two inputs of the payment form add up to, against what is owed. */
export const paymentDraft = (
  cashRaw: string,
  transferRaw: string,
  balance: number,
): PaymentDraft => {
  const cash = amount(cashRaw)
  const transfer = amount(transferRaw)
  const entered = Math.round((cash + transfer) * 100) / 100
  const left = Math.round((balance - entered) * 100) / 100
  return {
    cash,
    transfer,
    entered,
    remaining: left > TOLERANCE ? left : 0,
    exceeds: entered > balance + TOLERANCE,
  }
}

/** What the client still owes on an order (0 when nothing, or when the API predates the field). */
export const creditBalance = (order: Pick<Order, 'creditBalance'>): number =>
  (order.creditBalance ?? 0) > TOLERANCE ? (order.creditBalance ?? 0) : 0

/** The payments that count: a voided one stays on the list as a record, out of every sum. */
export const standingPayments = (payments: OrderPayment[] | undefined): OrderPayment[] =>
  (payments ?? []).filter((payment) => !payment.voidedAt)
