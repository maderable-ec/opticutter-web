import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { fmtLocalTime } from 'src/features/analytics/format'
import { localDateKey, relativeTime } from 'src/shared/utils/date'
import { fmtDate } from 'src/shared/utils/format'
import type {
  ActivityLiveState,
  ActivityLiveStatus,
  BranchProductionStatus,
  ProductionState,
} from './types'

// The live state of a branch's saw, as a badge: told by icon and word as well as by colour. Red is
// kept for the one state somebody has to act on — work waiting and nothing cut.
export const PRODUCTION_STATE_CONFIG: Record<ProductionState, StatusConfigEntry> = {
  cutting: { tone: 'success', icon: 'cut', label: 'Cortando' },
  stopped: { tone: 'danger', icon: 'stopped', label: 'Detenida' },
  idle: { tone: 'neutral', icon: 'inactive', label: 'Sin pendientes' },
}

/**
 * The line beside the badge: since when, and what is waiting.
 *
 * - Cortando: «desde 08:12 · ORD-000131».
 * - Detenida: «hace 45 min · 3 en cola · 1 en corte».
 * - Sin pendientes: «último corte 16:05», or its day when it was not today.
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

// The two tracks that mark no pieces, in the order the card lists them under the saw.
export const LIVE_ACTIVITIES = ['banding', 'additional'] as const
export type LiveActivity = (typeof LIVE_ACTIVITIES)[number]

// Waiting is not red: with the tracks in parallel, ready work sits for a while as a matter of
// course while the saw releases more. Only the saw's «Detenida» asks somebody to act.
const WAITING: StatusConfigEntry = { tone: 'progress', icon: 'queued', label: 'En espera' }
const IDLE: StatusConfigEntry = { tone: 'neutral', icon: 'inactive', label: 'Sin pendientes' }

export const ACTIVITY_LIVE_STATE_CONFIG: Record<
  LiveActivity,
  Record<ActivityLiveState, StatusConfigEntry>
> = {
  banding: {
    working: { tone: 'success', icon: 'edgeBand', label: 'Canteando' },
    waiting: WAITING,
    idle: IDLE,
  },
  additional: {
    working: { tone: 'success', icon: 'inProgress', label: 'En curso' },
    waiting: WAITING,
    idle: IDLE,
  },
}

// «último canteado 16:05» / «sin canteados registrados».
const CLOSED_NOUN: Record<LiveActivity, { one: string; many: string }> = {
  banding: { one: 'último canteado', many: 'canteados' },
  additional: { one: 'último adicional', many: 'adicionales' },
}

/**
 * The line beside a banding or additional badge.
 *
 * - Working: «desde 10:20 · ORD-000131».
 * - Waiting: «2 órdenes listas · hace 40 min» (since the oldest one became ready).
 * - Idle: «último canteado 16:05», or its day when it was not today.
 */
export const activityDetail = (
  activity: LiveActivity,
  status: ActivityLiveStatus,
  now = new Date(),
): string => {
  const { state, since, orderCodes, waitingCount, lastFinishedAt } = status
  if (state === 'working') {
    return [since && `desde ${fmtLocalTime(since)}`, orderCodes.join(', ')]
      .filter(Boolean)
      .join(' · ')
  }
  if (state === 'waiting') {
    return [
      waitingCount === 1 ? '1 orden lista' : `${waitingCount} órdenes listas`,
      since && relativeTime(since, now.getTime()),
    ]
      .filter(Boolean)
      .join(' · ')
  }
  const noun = CLOSED_NOUN[activity]
  if (!lastFinishedAt) return `sin ${noun.many} registrados`
  const today = localDateKey(new Date(lastFinishedAt)) === localDateKey(now)
  return `${noun.one} ${today ? fmtLocalTime(lastFinishedAt) : fmtDate(lastFinishedAt)}`
}
