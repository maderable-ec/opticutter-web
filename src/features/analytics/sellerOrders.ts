import { localDateKey } from 'src/shared/utils/date'
import { fmtDate, fmtMoney } from 'src/shared/utils/format'
import { PAYMENT_METHOD_LABEL } from 'src/features/orders/payments'
import type { SellerCollection, SellerOrder, SellerOutstandingOrder } from './types'

// The orders behind a seller's row. A sale counts on the day it is paid, for whoever raised the
// quote: what a seller disputes is usually the date, so every sale says both.

// «efectivo $50,00 · transferencia $10,00 · crédito $40,00», only the methods used.
export const paymentBreakdown = (o: SellerOrder): string =>
  [
    o.cash > 0 && `efectivo ${fmtMoney(o.cash)}`,
    o.transfer > 0 && `transferencia ${fmtMoney(o.transfer)}`,
    o.credit > 0 && `crédito ${fmtMoney(o.credit)}`,
  ]
    .filter(Boolean)
    .join(' · ') || 'sin montos'

// The order's own date, only when it is not the day of the payment: that is the sale that moves to
// another day (or another month) than the seller remembers.
export const orderDate = (o: SellerOrder): string | undefined =>
  localDateKey(new Date(o.createdAt)) === o.day ? undefined : `orden del ${fmtDate(o.createdAt)}`

// What became of the credit a sale was sold on: «crédito pagado», or «debe $30,00 de $80,00».
// Nothing for a sale with no credit in it.
export const creditStatus = (o: SellerOrder): string | undefined => {
  if (o.credit <= 0) return undefined
  return o.creditBalance > 0
    ? `debe ${fmtMoney(o.creditBalance)} de ${fmtMoney(o.credit)}`
    : 'crédito pagado'
}

// «transferencia · venta del 05/09/2026»: how the money came in and which sale it pays for. The
// sale's date only when it is another day — the payment of an old sale is the one worth a look.
export const collectionLine = (c: SellerCollection): string =>
  [
    PAYMENT_METHOD_LABEL[c.method].toLowerCase(),
    c.soldAt && localDateKey(new Date(c.soldAt)) !== c.day && `venta del ${fmtDate(c.soldAt)}`,
  ]
    .filter(Boolean)
    .join(' · ')

// «vendida el 05/09/2026 · abonado $50,00 de $80,00».
export const outstandingLine = (o: SellerOutstandingOrder): string =>
  [
    o.soldAt && `vendida el ${fmtDate(o.soldAt)}`,
    o.creditCollected > 0
      ? `abonado ${fmtMoney(o.creditCollected)} de ${fmtMoney(o.credit)}`
      : `a crédito ${fmtMoney(o.credit)}`,
  ]
    .filter(Boolean)
    .join(' · ')

// The invoice to cross-check in the accounting system, or that there is none.
export const invoiceLabel = (o: SellerOrder): string =>
  o.invoice ? `factura ${o.invoice}` : 'sin factura'
