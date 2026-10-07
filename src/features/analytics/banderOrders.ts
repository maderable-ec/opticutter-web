import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { fmtDecimal, fmtLocalTime } from './format'
import type { BanderOrder } from './types'

// The work behind a bander's row: each banding and additional work they closed, credited to whoever
// pressed «Terminar», on the day of the close.

// A start and a close tapped together after the work: it counts, it has no time.
export const UNCLOCKED: StatusConfigEntry = { tone: 'progress', icon: 'late', label: 'Sin tiempo' }

export const workHours = (o: BanderOrder): string =>
  o.hours == null ? '—' : `${fmtDecimal(o.hours)} h`

// «09:00 – 11:00», or when it was registered when it carries no time.
export const workSpan = (o: BanderOrder): string =>
  o.hours == null || !o.startedAt
    ? `registrada al cerrar, ${fmtLocalTime(o.finishedAt)}`
    : `${fmtLocalTime(o.startedAt)} – ${fmtLocalTime(o.finishedAt)}`
