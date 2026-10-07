import { localDateKey } from 'src/shared/utils/date'
import { fmtDate, fmtMoney } from 'src/shared/utils/format'
import type { SellerOrder } from './types'

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

// The invoice to cross-check in the accounting system, or that there is none.
export const invoiceLabel = (o: SellerOrder): string =>
  o.invoice ? `factura ${o.invoice}` : 'sin factura'
