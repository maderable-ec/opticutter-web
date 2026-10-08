import { localDateKey } from 'src/shared/utils/date'
import type { ActivityType, Order, OrderEvent, OrderStatus } from './types'

// The moments of an order's life the listing filters by, and who made each one happen. The
// filter itself is the backend's (`orders/order_events.py`); this module only names the events
// and reads the moment back off a row, so the listing can show WHEN and BY WHOM next to each
// order and the admin can check a figure somebody disputes by eye.

export interface EventOption {
  value: OrderEvent
  label: string
  // What «Hecho por» means for this event: the person it filters on.
  actor: string
}

const CREATED: EventOption = { value: 'created', label: 'Creada', actor: 'Vendedor' }

// In the order an order lives them.
export const EVENT_OPTIONS: EventOption[] = [
  CREATED,
  { value: 'paid', label: 'Cobrada', actor: 'Registró el cobro' },
  { value: 'in_process', label: 'Entró en proceso', actor: 'Inició el trabajo' },
  { value: 'cut_done', label: 'Corte terminado', actor: 'Cerró el corte' },
  { value: 'banding_done', label: 'Canteado terminado', actor: 'Cerró el canteado' },
  { value: 'additional_done', label: 'Adicionales terminados', actor: 'Cerró los adicionales' },
  { value: 'finished', label: 'Terminada', actor: 'Cerró la orden' },
  { value: 'dispatched', label: 'Despachada', actor: 'Despachó' },
  { value: 'cancelled', label: 'Cancelada', actor: 'Canceló' },
]

// The backend's default, and what the listing filtered by before there was a choice.
export const DEFAULT_EVENT: OrderEvent = 'created'

export const isOrderEvent = (value: string): value is OrderEvent =>
  EVENT_OPTIONS.some((o) => o.value === value)

export const eventOption = (event: OrderEvent): EventOption =>
  EVENT_OPTIONS.find((o) => o.value === event) ?? CREATED

export interface EventMark {
  at: string
  // The name frozen with the event; null when nobody was recorded (or the user is gone).
  by: string | null
}

// The local days the listing is filtered to, as `YYYY-MM-DD`; either end may be open.
export interface DayRange {
  from?: string
  to?: string
}

// The history moves each event reads. `cutting` is the legacy name of entering the shop.
const HISTORY_STATUSES: Partial<Record<OrderEvent, OrderStatus[]>> = {
  in_process: ['in_process', 'cutting'],
  finished: ['finished'],
  cancelled: ['cancelled'],
}

const ACTIVITY_EVENTS: Partial<Record<OrderEvent, ActivityType>> = {
  cut_done: 'cutting',
  banding_done: 'banding',
  additional_done: 'additional',
}

const inRange = (iso: string, range?: DayRange): boolean => {
  const day = localDateKey(new Date(iso))
  return (!range?.from || day >= range.from) && (!range?.to || day <= range.to)
}

// The latest mark inside the range, or the latest of all when none falls in it. An order can
// enter the shop twice (the admin rollback to the queue), and the row worth showing is the one
// the filter found.
const pick = (marks: EventMark[], range?: DayRange): EventMark | null => {
  const within = marks.filter((m) => inRange(m.at, range))
  return (within.length ? within : marks).reduce<EventMark | null>(
    (last, m) => (last === null || Date.parse(m.at) > Date.parse(last.at) ? m : last),
    null,
  )
}

type EventSource = Pick<
  Order,
  | 'createdAt'
  | 'createdByName'
  | 'queuedAt'
  | 'dispatchedAt'
  | 'dispatchedByLabel'
  | 'history'
  | 'activities'
>

/**
 * When `event` happened to `order` and who did it, or `null` when it has not happened.
 *
 * The same rows the backend filters on: a history row only counts when it really moved the status
 * (marking a priority or moving the branch writes one with `from === to`), and a payment is the
 * frozen `queuedAt` with the actor of the `confirmed → queued` row — the admin rollback to the
 * queue is not a second payment.
 */
export const orderEvent = (
  order: EventSource,
  event: OrderEvent,
  range?: DayRange,
): EventMark | null => {
  const moves = (order.history ?? []).filter((h) => h.fromStatus !== h.toStatus)
  switch (event) {
    case 'created':
      return { at: order.createdAt, by: order.createdByName ?? null }
    case 'paid': {
      if (!order.queuedAt) return null
      const row = moves.find((h) => h.fromStatus === 'confirmed' && h.toStatus === 'queued')
      return { at: order.queuedAt, by: row?.actorLabel ?? null }
    }
    case 'dispatched':
      return order.dispatchedAt
        ? { at: order.dispatchedAt, by: order.dispatchedByLabel ?? null }
        : null
  }
  const statuses = HISTORY_STATUSES[event]
  if (statuses) {
    return pick(
      moves
        .filter((h) => statuses.includes(h.toStatus))
        .map((h) => ({ at: h.createdAt, by: h.actorLabel ?? null })),
      range,
    )
  }
  const activity = (order.activities ?? []).find((a) => a.type === ACTIVITY_EVENTS[event])
  return activity?.finishedAt
    ? { at: activity.finishedAt, by: activity.finishedByLabel ?? null }
    : null
}

// The listing's event filter as the URL and the panel hold it: strings, '' = unset.
export interface EventFilterValues {
  dateField: OrderEvent
  dateFrom: string
  dateTo: string
  actorId: string
}

/**
 * The event filter off the URL. Links and remembered lists from before the choice existed say
 * `createdFrom`/`createdTo`, which is a `created` range — read as one, so an old bookmark keeps
 * showing what it always showed. An unknown event falls back to the default.
 */
export const readEventFilter = (get: (key: string) => string): EventFilterValues => {
  const raw = get('dateField')
  const dateField = isOrderEvent(raw) ? raw : DEFAULT_EVENT
  const legacy = dateField === 'created' && !get('dateFrom') && !get('dateTo')
  return {
    dateField,
    dateFrom: get('dateFrom') || (legacy ? get('createdFrom') : ''),
    dateTo: get('dateTo') || (legacy ? get('createdTo') : ''),
    actorId: get('actorId'),
  }
}

/**
 * The API params of the event filter. The event travels only with something for it to read: on
 * its own it filters nothing, and leaving it out keeps the plain listing's request what it always
 * was.
 */
export const eventFilterParams = (
  values: EventFilterValues,
): { dateField?: OrderEvent; dateFrom?: string; dateTo?: string; actorId?: number } => ({
  dateField: values.dateFrom || values.dateTo || values.actorId ? values.dateField : undefined,
  dateFrom: values.dateFrom || undefined,
  dateTo: values.dateTo || undefined,
  actorId: values.actorId ? Number(values.actorId) : undefined,
})
