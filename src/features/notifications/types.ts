export type NotificationType = 'order.completed' | 'order.queued'

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
