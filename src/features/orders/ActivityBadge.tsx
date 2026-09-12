import { CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { activityBadge } from './activities'
import type { OrderActivity } from './types'

// Badge for one activity of an order in process. Replaces `BandingStatusBadge`: the name and the
// state both come from the activity's own row (`activities.ts`), so the three read the same way.
// There is no `not_applicable` any more: an activity that does not apply has no entry to render.
//
// It prints the TRACK and draws the state — "Corte ✓" rather than "Corte listo"; `STATUS_ICON`
// carries why. Two consequences to keep whenever this is touched:
//
//  - It no longer goes through the shared `StatusBadge`. That component is a label-by-value lookup
//    for eight features and this one had been feeding it a single-entry `config` to compute its
//    label — a rodeo before, and an icon it has no field for now.
//  - The word survives in the DOM. `title` puts it in the tooltip (the listing has a mouse; the
//    shop floor does not), and `.visually-hidden` is what a screen reader reads — with the state
//    carried only by an `aria-hidden` glyph, the badge would announce "Corte" and drop the half
//    that matters.
interface ActivityBadgeProps {
  activity: OrderActivity
}

const ActivityBadge = ({ activity }: ActivityBadgeProps) => {
  const { color, icon, label, statusWord } = activityBadge(activity)
  const full = `${label} ${statusWord}`
  return (
    <CBadge
      color={color}
      title={full}
      className="d-inline-flex align-items-center gap-1 text-nowrap"
    >
      <CIcon icon={icon} size="sm" aria-hidden="true" />
      {label}
      <span className="visually-hidden">{statusWord}</span>
    </CBadge>
  )
}

export default ActivityBadge
