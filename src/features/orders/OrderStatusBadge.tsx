import { CBadge } from '@coreui/react'
import type { OrderStatus } from './types'

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  confirmed: { color: 'primary', label: 'Confirmada' },
  approved: { color: 'success', label: 'Aprobada' },
  in_production: { color: 'warning', label: 'En producción' },
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
