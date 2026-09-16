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
