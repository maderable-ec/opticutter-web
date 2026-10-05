import type { StatusTone } from 'src/shared/components/StatusBadge'
import { formatDate } from 'src/shared/utils/date'
import type { LowStockItem } from 'src/features/inventory/types'
import { ORDER_STATUS_CONFIG } from 'src/features/orders/status'
import type { Order, OrderListParams } from 'src/features/orders/types'
import { OPEN_STATES, PREORDER_STATUS_CONFIG, isExpiringSoon } from 'src/features/preorders/status'
import type { PreOrderListParams, PreOrderSummary } from 'src/features/preorders/types'
import type { IconName } from 'src/shared/icons/registry'

// What the home screen counts and where each count leads. Pure, so the rules are tested without a
// browser; `useHome` runs the queries and `HomePage` draws them.

type LinkParams = Record<string, string | number | boolean | readonly string[] | undefined>

/** A listing already filtered, in the listing's own URL keys (the ones `useListParams` reads). */
export const listLink = (path: string, params: LinkParams): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v))
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

// The filters behind each count. The same object feeds the query and the link, so the number on the
// row and the list it opens can never disagree.
export const CHANGES_REQUESTED: PreOrderListParams = { status: ['changes_requested'] }
// Oldest first: a quote expires a fixed number of days after it was created (or after its review
// link was last generated), so the ones about to lapse sit at the head of this order.
export const OPEN_OLDEST: PreOrderListParams = { status: OPEN_STATES, sort: 'oldest' }
export const TO_QUEUE: OrderListParams = { status: ['confirmed'] }
export const TO_DISPATCH: OrderListParams = { status: ['finished'] }
export const QUEUED: OrderListParams = { status: ['queued'] }
export const IN_PROCESS: OrderListParams = { status: ['in_process'] }
export const STALEST: OrderListParams = { status: ['queued', 'in_process'], sort: 'stalest' }

export type AttentionKey = 'changesRequested' | 'expiringSoon' | 'toQueue' | 'toDispatch'

export interface HomeRowSpec {
  label: string
  // What the count is, in a line: the row has no other place to say it (no hover on a tablet).
  hint: string
  icon?: IconName
  // Only while the count is above zero; an empty row goes neutral so the screen lights up where
  // there is something to do.
  tone: StatusTone
  to: string
}

// A row's icon and tone, taken from the status it counts.
const entry = ({ icon, tone }: { icon?: IconName; tone: StatusTone }) => ({ icon, tone })

/**
 * «Requiere atención»: the four piles that wait on the office, not on the shop. Each row keeps the
 * icon and tone of the status it counts, so it reads as the same thing on the list it opens.
 */
export const attentionRows = (branchId?: number): Record<AttentionKey, HomeRowSpec> => ({
  changesRequested: {
    ...entry(PREORDER_STATUS_CONFIG.changes_requested),
    label: 'Cambios solicitados',
    hint: 'El cliente respondió y espera la cotización corregida.',
    to: listLink('/preorders', { ...CHANGES_REQUESTED, branchId }),
  },
  expiringSoon: {
    icon: 'expiring',
    tone: 'danger',
    label: 'Por vencer',
    hint: 'Cotizaciones abiertas que vencen en 3 días o menos.',
    to: listLink('/preorders', { ...OPEN_OLDEST, branchId }),
  },
  toQueue: {
    ...entry(ORDER_STATUS_CONFIG.confirmed),
    label: 'Por cobrar',
    hint: 'Órdenes confirmadas: al cobrarlas pasan a la cola del taller.',
    to: listLink('/orders', { ...TO_QUEUE, branchId }),
  },
  toDispatch: {
    ...entry(ORDER_STATUS_CONFIG.finished),
    label: 'Por despachar',
    hint: 'Órdenes terminadas que esperan su entrega.',
    to: listLink('/orders', { ...TO_DISPATCH, branchId }),
  },
})

export type ProductionKey = 'queued' | 'inProcess'

export const productionRows = (branchId?: number): Record<ProductionKey, HomeRowSpec> => ({
  queued: {
    ...entry(ORDER_STATUS_CONFIG.queued),
    label: 'En cola',
    hint: 'Cobradas, esperando que el taller las tome.',
    to: listLink('/orders', { ...QUEUED, branchId }),
  },
  inProcess: {
    ...entry(ORDER_STATUS_CONFIG.in_process),
    label: 'En proceso',
    hint: 'En corte, canteado o adicionales.',
    to: listLink('/orders', { ...IN_PROCESS, branchId }),
  },
})

export const stalestLink = (branchId?: number) => listLink('/orders', { ...STALEST, branchId })

/** The open quotes among `quotes` that lapse within three days (`isExpiringSoon`). */
export const countExpiringSoon = (quotes: Pick<PreOrderSummary, 'expiresAt' | 'status'>[]) =>
  quotes.filter((q) => isExpiringSoon(q.expiresAt, q.status)).length

const sameLocalDay = (iso: string, now: Date) => {
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export interface TodayFigures {
  orders: number
  // The orders' totals, tax included, as the client confirmed them.
  sold: number
  // Sheets, a half board counting as half.
  boards: number
}

/**
 * The `createdFrom`/`createdTo` that cover today in local time. The listing cuts by UTC day, and a
 * local day straddles two of them (in Ecuador it runs 05:00 to 05:00 UTC), so this asks for both
 * and `todayFigures` keeps the local day.
 */
export const todayRange = (
  now = new Date(),
): Pick<OrderListParams, 'createdFrom' | 'createdTo'> => {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { createdFrom: formatDate(start), createdTo: formatDate(end) }
}

/**
 * The day so far, from the orders born today (an order is born when the client confirms the quote).
 * Computed here and not read off `analytics/summary`: its revenue and boards count only orders
 * that are already finished or dispatched, so for "today" they read zero almost always. Local day,
 * and cancelled orders left out.
 */
export const todayFigures = (
  orders: Pick<Order, 'createdAt' | 'status' | 'total' | 'lines'>[],
  now = new Date(),
): TodayFigures => {
  const today = orders.filter((o) => o.status !== 'cancelled' && sameLocalDay(o.createdAt, now))
  return {
    orders: today.length,
    sold: today.reduce((sum, o) => sum + o.total, 0),
    boards: today.reduce(
      (sum, o) =>
        sum +
        o.lines
          // Edge banding carries its metres; a board line does not.
          .filter((l) => l.linearM == null)
          .reduce((n, l) => n + l.quantity * (l.halfBoard ? 0.5 : 1), 0),
      0,
    ),
  }
}

export interface StockCounts {
  low: number
  out: number
}

/** Products under their threshold in one branch (or all), split into low and out of stock. */
export const stockCounts = (items: LowStockItem[], branchId?: number): StockCounts => {
  const mine = items.filter((i) => branchId === undefined || i.branch.id === branchId)
  const out = mine.filter((i) => i.available <= 0).length
  return { low: mine.length - out, out }
}

export const lowStockLink = (branchId?: number) => listLink('/catalog/low-stock', { branchId })
