import { CBadge } from '@coreui/react'
import type { BandingStatus } from './types'

// Chip de la pista de canteado (paralela al corte). `not_applicable` normalmente se oculta;
// quien lo muestre debe decidir el caso (aquí lo rinde como "Sin canteado" en tono neutro).
const BANDING_CONFIG: Record<BandingStatus, { color: string; label: string }> = {
  not_applicable: { color: 'light', label: 'Sin canteado' },
  pending: { color: 'secondary', label: 'Canteado pendiente' },
  in_progress: { color: 'warning', label: 'Canteando' },
  done: { color: 'success', label: 'Canteado listo' },
}

interface BandingStatusBadgeProps {
  status: BandingStatus
}

const BandingStatusBadge = ({ status }: BandingStatusBadgeProps) => {
  const config = BANDING_CONFIG[status] ?? { color: 'secondary', label: status }
  return <CBadge color={config.color}>{config.label}</CBadge>
}

export default BandingStatusBadge
