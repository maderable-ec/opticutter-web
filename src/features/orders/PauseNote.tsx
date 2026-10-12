import { relativeTime } from 'src/shared/utils/date'
import { fmtDateTime } from 'src/shared/utils/format'
import { isPaused, pauseReasonLabel } from './activities'
import { pauseClock } from './elapsed'
import type { OrderActivity } from './types'

interface PauseNoteProps {
  activity: OrderActivity
  className?: string
}

/**
 * «Sin tableros · hace 2 h» beside a paused activity's badge, where its clock would be.
 *
 * In secondary ink on purpose, never amber or red: the activity's own clock goes quiet while it is
 * paused (`activityClock`), because nobody doing the work is late — the stretch is out of their
 * time. The reason is what the office reads here, and it is the office that has to act on it.
 */
const PauseNote = ({ activity, className }: PauseNoteProps) => {
  const since = pauseClock(activity)
  if (!isPaused(activity) || !since) return null
  return (
    <span className={`small text-body-secondary ${className ?? ''}`} title={fmtDateTime(since)}>
      {pauseReasonLabel(activity.pauseReason)} · {relativeTime(since)}
    </span>
  )
}

export default PauseNote
