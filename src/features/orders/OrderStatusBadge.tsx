import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { OrderStatus } from './types'

const STATUS_CONFIG: Record<OrderStatus, StatusConfigEntry> = {
  confirmed: { color: 'primary', label: 'Confirmada' },
  queued: { color: 'info', label: 'En cola' },
  cutting: { color: 'warning', label: 'En corte' },
  cut: { color: 'info', label: 'Cortada' },
  completed: { color: 'success', label: 'Completada' },
  despachado: { color: 'dark', label: 'Despachada' },
  cancelled: { color: 'danger', label: 'Cancelada' },
}

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => (
  <StatusBadge config={STATUS_CONFIG} value={status} />
)

export default OrderStatusBadge
