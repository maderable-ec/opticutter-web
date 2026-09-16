import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { OrderStatus } from './types'

// Everything the app needs to know about where an order stands, in one place — the companion of
// `preorders/status.ts` and of `activities.ts`, which owns the work UNDER `in_process`. Before
// this module the labels were written twice (the badge's config and the list page's filter
// options) and the state graph lived inline at the top of the detail page, which is not where
// the list page or a future caller would look for it.

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfigEntry> = {
  confirmed: { color: 'primary', label: 'Confirmada' },
  queued: { color: 'info', label: 'En cola' },
  in_process: { color: 'warning', label: 'En proceso' },
  finished: { color: 'success', label: 'Terminada' },
  dispatched: { color: 'dark', label: 'Despachada' },
  cancelled: { color: 'danger', label: 'Cancelada' },
  // Legacy: only ever read off the `history` of an order cut before the activities existed.
  // They are in the config because the label lookup is by key and would otherwise crash on a
  // real order — and out of ORDER_STATUS_VALUES because nothing can be filtered by them.
  cutting: { color: 'warning', label: 'En corte' },
  cut: { color: 'info', label: 'Cortada' },
}

// The statuses an order can actually be in, in process order: the listing's filter options.
// NOT `Object.keys(ORDER_STATUS_CONFIG)`, which would offer the two legacy ones.
export const ORDER_STATUS_VALUES: OrderStatus[] = [
  'confirmed',
  'queued',
  'in_process',
  'finished',
  'dispatched',
  'cancelled',
]

export const statusLabel = (status: OrderStatus) => ORDER_STATUS_CONFIG[status].label

// Nothing more happens to the order.
const TERMINAL_STATES: OrderStatus[] = ['dispatched', 'cancelled']

// States where the cutting plan is relevant: queued (interactive in the workshop) and beyond
// (read-only, auditing what was cut).
const WORKSHOP_STATES: OrderStatus[] = ['queued', 'in_process', 'finished']

// States where attachments are frozen (matches the backend 422 gate). Note this includes
// `finished`, unlike the terminal set which only covers dispatched/cancelled.
const ATTACHMENTS_LOCKED: OrderStatus[] = ['finished', 'dispatched', 'cancelled']

export const isTerminal = (status: OrderStatus) => TERMINAL_STATES.includes(status)
export const hasWorkshopPlan = (status: OrderStatus) => WORKSHOP_STATES.includes(status)
export const attachmentsLocked = (status: OrderStatus) => ATTACHMENTS_LOCKED.includes(status)

export interface StatusTransition {
  to: OrderStatus
  label: string
  color: string
  roles: string[]
  /**
   * Never the footer's primary button, however few transitions the status offers. `queued` offers
   * ONLY "Cancelar", and the positional `[0]` rule would have promoted it to the big brand-coloured
   * call to action on an order the shop is about to cut.
   */
  destructive?: boolean
  /**
   * The modal's note stops being optional. The server rejects a cancellation with a blank `note`
   * (422): there is no reason column and no `cancelled_by`, so that note is the only record of why
   * a sale died. Declared here rather than derived from `to === 'cancelled'` so the generic modal
   * keeps reading its rules off this table.
   */
  requiresNote?: boolean
}

// The forward move of each state comes first: the detail page's footer promotes the first
// NON-destructive one to its primary button and renders the rest as outline siblings.
//
// The shop floor's two moves are NOT here: taking an order and finishing it are derived from
// the activities (`activities.ts`), so `queued` offers nothing forward on this endpoint and
// `in_process` only offers the admin rollback. What is left is what genuinely is a status
// call: the commercial ones at both ends.
//
// Cancelling narrows as the order advances, and that mirrors `TRANSITION_ROLES` on the server:
// from `confirmed` the quote merely died and admin/seller both retire it, but from `queued` the
// client has already PAID — the payment is what gates the way into the queue — so it is admin
// only. The seller who raised the order does not undo a collected sale, and the shop floor
// (which does not reach this page anyway) never cancels work.
export const STATUS_TRANSITIONS: Partial<Record<OrderStatus, StatusTransition[]>> = {
  confirmed: [
    {
      to: 'queued',
      label: 'Poner en cola',
      color: 'primary',
      roles: ['administrador', 'vendedor'],
    },
    {
      to: 'cancelled',
      label: 'Cancelar',
      color: 'danger',
      roles: ['administrador', 'vendedor'],
      destructive: true,
      requiresNote: true,
    },
  ],
  queued: [
    {
      to: 'cancelled',
      label: 'Cancelar orden',
      color: 'danger',
      roles: ['administrador'],
      destructive: true,
      requiresNote: true,
    },
  ],
  in_process: [
    { to: 'queued', label: 'Regresar a cola', color: 'secondary', roles: ['administrador'] },
  ],
  finished: [
    {
      to: 'dispatched',
      label: 'Despachar',
      color: 'success',
      roles: ['administrador', 'vendedor'],
    },
  ],
}

export const transitionsFor = (status: OrderStatus, role: string | undefined) =>
  isTerminal(status)
    ? []
    : (STATUS_TRANSITIONS[status] ?? []).filter((t) => t.roles.includes(role ?? ''))
