import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell } from '@coreui/icons'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from './useNotifications'
import type { Notification } from './types'
import { relativeTime } from 'src/shared/utils/date'

const NotificationBell = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const unreadCount = useUnreadNotificationCount()
  const list = useNotifications({ limit: 10 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
  }, [location.pathname, queryClient])

  const count = unreadCount.data?.count ?? 0

  const handleItemClick = (notification: Notification) => {
    if (notification.readAt === null) markRead.mutate(notification.id)
    if (notification.orderId != null) navigate(`/orders/${notification.orderId}`)
  }

  return (
    <CDropdown variant="nav-item" placement="bottom-end" onShow={() => list.refetch()}>
      <CDropdownToggle caret={false} className="position-relative">
        <CIcon icon={cilBell} size="lg" />
        {count > 0 && (
          <CBadge color="danger" position="top-end" shape="rounded-pill">
            {count > 99 ? '99+' : count}
          </CBadge>
        )}
      </CDropdownToggle>
      <CDropdownMenu className="p-0" style={{ minWidth: 320, maxWidth: 380 }}>
        <CDropdownHeader className="d-flex align-items-center justify-content-between gap-2 bg-body-secondary">
          <span className="fw-semibold">Notificaciones</span>
          {count > 0 && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Marcar todas como leídas
            </button>
          )}
        </CDropdownHeader>
        <CDropdownDivider className="m-0" />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {list.isLoading ? (
            <div className="d-flex justify-content-center p-3">
              <CSpinner size="sm" />
            </div>
          ) : list.data && list.data.items.length > 0 ? (
            list.data.items.map((notification) => (
              <CDropdownItem
                key={notification.id}
                as="button"
                type="button"
                className={`d-block text-wrap py-2 ${
                  notification.readAt === null ? 'fw-semibold bg-body-tertiary' : ''
                }`}
                onClick={() => handleItemClick(notification)}
              >
                <div>{notification.title}</div>
                <div className="small text-body-secondary fw-normal">{notification.body}</div>
                <div className="small text-body-secondary fw-normal">
                  {relativeTime(notification.createdAt)}
                </div>
              </CDropdownItem>
            ))
          ) : (
            <div className="text-center text-body-secondary p-3 small">
              No tienes notificaciones
            </div>
          )}
        </div>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default NotificationBell
