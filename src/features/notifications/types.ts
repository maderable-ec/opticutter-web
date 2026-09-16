/** Mirrors the backend's ``NotificationType``. The wire value is the contract;
 *  an unknown one still renders (the bell falls back to a neutral icon). */
export type NotificationType =
  | 'order.completed'
  | 'order.queued'
  /** The client accepted the quote from the review link: goes to whoever raised it. */
  | 'order.confirmed'
  /** A queued order was moved between branches: the two halves of one move. */
  | 'order.branch_arrived'
  | 'order.branch_left'
  /** An order was cancelled. Always to the administrators (a confirmed order is a closed sale,
   *  so killing one is a sale that died), plus the branch's operators when it was cancelled out
   *  of the queue — that is the case where a card vanishes off their board, and the body says so.
   *  `data.fromStatus` is what the server's copy turns on. */
  | 'order.cancelled'

export interface Notification {
  id: number
  type: NotificationType
  title: string
  body: string
  orderId: number | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationListParams {
  unread?: boolean
  offset?: number
  limit?: number
}
