import { CBadge } from '@coreui/react'
import type { PreOrderStatus } from './types'

const COLOR: Record<PreOrderStatus, string> = {
  draft: 'secondary',
  sent: 'info',
  changes_requested: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  expired: 'secondary',
  cancelled: 'danger',
}

const LABEL: Record<PreOrderStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  changes_requested: 'Cambios solicitados',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  cancelled: 'Cancelada',
}

interface Props {
  status: PreOrderStatus
}

const PreOrderStatusBadge = ({ status }: Props) => (
  <CBadge color={COLOR[status] ?? 'secondary'}>{LABEL[status] ?? status}</CBadge>
)

export default PreOrderStatusBadge
