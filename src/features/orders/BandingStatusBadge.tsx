import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { BandingStatus } from './types'

// Badge for the banding track (parallel to cutting). `not_applicable` is normally hidden;
// the caller decides how to handle it (here rendered as "Sin canteado" in a neutral tone).
const BANDING_CONFIG: Record<BandingStatus, StatusConfigEntry> = {
  not_applicable: { color: 'light', label: 'Sin canteado' },
  pending: { color: 'secondary', label: 'Canteado pendiente' },
  in_progress: { color: 'warning', label: 'Canteando' },
  done: { color: 'success', label: 'Canteado listo' },
}

// The same labels in prose, for callers that write a sentence instead of a badge
// ("Canteando hace 40 min" on the shop-floor card).
export const bandingLabel = (status: BandingStatus): string => BANDING_CONFIG[status].label

interface BandingStatusBadgeProps {
  status: BandingStatus
}

const BandingStatusBadge = ({ status }: BandingStatusBadgeProps) => (
  <StatusBadge config={BANDING_CONFIG} value={status} />
)

export default BandingStatusBadge
