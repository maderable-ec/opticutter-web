import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from './notificationsApi'
import type { NotificationListParams } from './types'

const UNREAD_COUNT_POLL_MS = 60_000

export const useNotifications = (params?: NotificationListParams) =>
  useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.list(params),
  })

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: UNREAD_COUNT_POLL_MS,
  })

export const useMarkNotificationRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
