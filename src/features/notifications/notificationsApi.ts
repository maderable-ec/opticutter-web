import { httpClient } from 'src/shared/api/httpClient'
import type { Notification, NotificationListParams } from './types'

const BASE = '/api/v1/notifications'

export const notificationsApi = {
  list: ({ unread, offset = 0, limit = 20 }: NotificationListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (unread !== undefined) params.set('unread', String(unread))
    return httpClient.list<Notification>(`${BASE}/?${params}`)
  },
  unreadCount: () => httpClient.get<{ count: number }>(`${BASE}/unread-count`),
  markRead: (id: number) => httpClient.patch<Notification>(`${BASE}/${id}/read`),
  markAllRead: () => httpClient.post<{ count: number }>(`${BASE}/read-all`),
}
