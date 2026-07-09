import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { PreOrderStatus } from './types'

const STATUS_CONFIG: Record<PreOrderStatus, StatusConfigEntry> = {
  draft: { color: 'secondary', label: 'Borrador' },
  sent: { color: 'info', label: 'Enviada' },
  changes_requested: { color: 'warning', label: 'Cambios solicitados' },
  confirmed: { color: 'success', label: 'Confirmada' },
  rejected: { color: 'danger', label: 'Rechazada' },
  expired: { color: 'secondary', label: 'Vencida' },
  cancelled: { color: 'danger', label: 'Cancelada' },
}

interface Props {
  status: PreOrderStatus
}

const PreOrderStatusBadge = ({ status }: Props) => (
  <StatusBadge config={STATUS_CONFIG} value={status} />
)

export default PreOrderStatusBadge
