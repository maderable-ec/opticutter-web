import { CBadge } from '@coreui/react'
import type { BandingStatus } from './types'

// Badge for the banding track (parallel to cutting). `not_applicable` is normally hidden;
// the caller decides how to handle it (here rendered as "Sin canteado" in a neutral tone).
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
