import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { fmtLocalTime } from 'src/features/analytics/format'
import { localDateKey, relativeTime } from 'src/shared/utils/date'
import { fmtDate } from 'src/shared/utils/format'
import type { BranchProductionStatus, ProductionState } from './types'

// The live state of a branch's saw, as a badge: told by icon and word as well as by colour. Red is
// kept for the one state somebody has to act on — work waiting and nothing cut.
export const PRODUCTION_STATE_CONFIG: Record<ProductionState, StatusConfigEntry> = {
  cutting: { tone: 'success', icon: 'cut', label: 'Cortando' },
  stopped: { tone: 'danger', icon: 'stopped', label: 'Detenida' },
  idle: { tone: 'neutral', icon: 'inactive', label: 'Sin trabajo' },
}

/**
 * The line beside the badge: since when, and what is waiting.
 *
 * - Cortando: «desde 08:12 · ORD-000131».
 * - Detenida: «hace 45 min · 3 en cola · 1 en corte».
 * - Sin trabajo: «último corte 16:05», or its day when it was not today.
 */
export const statusDetail = (branch: BranchProductionStatus, now = new Date()): string => {
  const { state, since, lastEventAt, queuedCount, cuttingOrderCodes } = branch
  if (state === 'cutting') {
    return [since && `desde ${fmtLocalTime(since)}`, cuttingOrderCodes.join(', ')]
      .filter(Boolean)
      .join(' · ')
  }
  if (state === 'stopped') {
    return [
      since ? relativeTime(since, now.getTime()) : 'sin cortes registrados',
      queuedCount > 0 && `${queuedCount} en cola`,
      cuttingOrderCodes.length > 0 && `${cuttingOrderCodes.length} en corte`,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  if (!lastEventAt) return 'sin cortes registrados'
  const today = localDateKey(new Date(lastEventAt)) === localDateKey(now)
  return `último corte ${today ? fmtLocalTime(lastEventAt) : fmtDate(lastEventAt)}`
}
