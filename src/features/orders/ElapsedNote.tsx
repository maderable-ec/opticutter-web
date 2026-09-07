import { relativeTime } from 'src/shared/utils/date'
import { fmtDateTime } from 'src/shared/utils/format'
import { elapsedTone, TONE_CLASS } from './elapsed'
import type { OrderStatus } from './types'

interface ElapsedNoteProps {
  // Where the clock starts, or null for "show nothing" — the callers get this from
  // `statusClock`/`bandingClock`, which own the decision.
  iso: string | null
  // Only to pick the thresholds; the badge above already says which status this is.
  status?: OrderStatus
  className?: string
}

/**
 * "hace 3 h" under a status badge, coloured by how late it is.
 *
 * The colour lives on THIS text and never on the badge: the badge's palette already means
 * something else (which status it is — `cutting` is amber and `cancelled` red before any
 * clock runs), and two meanings in one pixel is no meaning at all. The colour is also never
 * the only carrier: the text says the number, so it reads the same without it.
 */
const ElapsedNote = ({ iso, status, className }: ElapsedNoteProps) => {
  if (!iso) return null
  return (
    <div
      className={`small ${TONE_CLASS[elapsedTone(iso, status)]} ${className ?? ''}`}
      // A relative time always needs a way back to the exact moment.
      title={fmtDateTime(iso)}
    >
      {relativeTime(iso)}
    </div>
  )
}

export default ElapsedNote
