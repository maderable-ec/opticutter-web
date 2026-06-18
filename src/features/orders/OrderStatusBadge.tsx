import { CBadge } from '@coreui/react'
import type { OrderStatus } from './types'

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  confirmed: { color: 'primary', label: 'Confirmada' },
  in_production: { color: 'info', label: 'En producción' },
  cutting: { color: 'warning', label: 'En corte' },
  cut: { color: 'info', label: 'Cortada' },
  completed: { color: 'success', label: 'Completada' },
  cancelled: { color: 'danger', label: 'Cancelada' },
}

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const config = STATUS_CONFIG[status] ?? { color: 'secondary', label: status }
  return <CBadge color={config.color}>{config.label}</CBadge>
}

export default OrderStatusBadge
