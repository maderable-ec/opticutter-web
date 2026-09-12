import type { ActivityStatus, Order, OrderActivity, OrderStatus, WorkshopQueueItem } from './types'

// How long an order has been sitting where it is — the signal the office pushes people
// with. One module because three surfaces read the same rule (the listing's Estado and
// Actividades columns, and the shop-floor card), and a rule about who is late is not a
// thing to reimplement per screen.

/**
 * Statuses whose clock stays silent: nothing is going to move them, so an age here is
 * noise on rows that live in the listing forever ("hace 6 meses" under every dispatched
 * order). It is the backend's `TERMINAL_STATUSES`.
 *
 * NOT `isTerminal` from `status.ts` — that one is missing `finished`, because it answers
 * a different question (which orders still offer a transition).
 */
const CLOCK_MUTE: OrderStatus[] = ['finished', 'dispatched', 'cancelled']

/** An activity's clock stops once it is done: nobody is late any more. */
const ACTIVITY_CLOCK_MUTE: ActivityStatus[] = ['done']

// Amber at an hour, red at four: the shop works same-day, so an order that has not moved
// by mid-afternoon lost its day. Keyed by status so tuning one stage later is a line —
// `confirmed` is the candidate, since there the order waits on the CLIENT to pay rather
// than on anybody here.
const DEFAULT_THRESHOLDS = { amber: 60 * 60 * 1000, danger: 4 * 60 * 60 * 1000 }
const THRESHOLDS: Partial<Record<OrderStatus, typeof DEFAULT_THRESHOLDS>> = {}

export type ElapsedTone = 'muted' | 'warning' | 'danger'

/** Bootstrap text class per tone. `muted` is the resting state, not an absence of one. */
export const TONE_CLASS: Record<ElapsedTone, string> = {
  muted: 'text-body-secondary',
  warning: 'text-warning-emphasis fw-semibold',
  danger: 'text-danger-emphasis fw-semibold',
}

/** Where the order's own clock starts, or `null` when it should show nothing. */
export const statusClock = (
  order: Pick<Order, 'status' | 'statusChangedAt' | 'queuedAt' | 'createdAt'>,
): string | null => {
  if (CLOCK_MUTE.includes(order.status)) return null
  // A queued order measures the wait from when it REACHED the shop, which is frozen on the
  // first enqueue and is what the board's FIFO sorts by. `statusChangedAt` moves on the
  // admin rollback `in_process → queued`, so using it here would hand a fresh-looking card
  // to an order that has been waiting since morning.
  if (order.status === 'queued') return order.queuedAt ?? order.statusChangedAt ?? order.createdAt
  return order.statusChangedAt ?? order.createdAt
}

/**
 * Where one activity's clock starts, or `null` for nothing.
 *
 * `pending` counts from `readyAt` and not from the order's creation: until the activity's
 * floor opens (the first piece of its set cut) whoever does it is BLOCKED by the same gate
 * the API enforces, and a clock that runs while somebody is not allowed to work puts the
 * wrong person in red. Null there is the correct answer, not missing data.
 *
 * One rule for the three activities: it was written for the banding and is true of all of
 * them, which is the point of them being one concept.
 */
export const activityClock = (activity: OrderActivity): string | null => {
  if (ACTIVITY_CLOCK_MUTE.includes(activity.status)) return null
  return (activity.status === 'pending' ? activity.readyAt : activity.startedAt) ?? null
}

/** Same rule, for the shop-floor card (a different shape, never a different answer). */
export const queueStatusClock = (item: WorkshopQueueItem): string | null =>
  statusClock({
    status: item.status,
    statusChangedAt: item.statusChangedAt,
    queuedAt: item.queuedAt,
    createdAt: item.createdAt,
  })

/**
 * How loud the elapsed time should read. Clock-relative in the same way `relativeTime` is:
 * it reads `Date.now()` when called, so a component using it only tells the truth for as
 * long as it takes to re-render (the listing polls; the board already did).
 */
export const elapsedTone = (iso: string, status?: OrderStatus): ElapsedTone => {
  const { amber, danger } = (status && THRESHOLDS[status]) ?? DEFAULT_THRESHOLDS
  const age = Date.now() - new Date(iso).getTime()
  if (age >= danger) return 'danger'
  if (age >= amber) return 'warning'
  return 'muted'
}
