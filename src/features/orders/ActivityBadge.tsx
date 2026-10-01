import Icon from 'src/shared/icons/Icon'

import { activityBadge } from './activities'
import type { OrderActivity } from './types'

// Badge for one activity of an order in process. Replaces `BandingStatusBadge`: the name and the
// state both come from the activity's own row (`activities.ts`), so the three read the same way.
// There is no `not_applicable` any more: an activity that does not apply has no entry to render.
//
// It prints the TRACK and draws the state — "Corte ✓" rather than "Corte listo"; `STATUS_ICON`
// carries why. Two consequences to keep whenever this is touched:
//
//  - It does not go through the shared `StatusBadge`, only its `.status-pill` look. That component is
//    a label-by-value lookup, and this badge's label is the TRACK while its icon is the STATE — two
//    lookups a single config entry cannot express.
//  - The word survives in the DOM. `title` puts it in the tooltip (the listing has a mouse; the
//    shop floor does not), and `.visually-hidden` is what a screen reader reads — with the state
//    carried only by an `aria-hidden` glyph, the badge would announce "Corte" and drop the half
//    that matters.
interface ActivityBadgeProps {
  activity: OrderActivity
}

const ActivityBadge = ({ activity }: ActivityBadgeProps) => {
  const { tone, icon, label, statusWord } = activityBadge(activity)
  const full = `${label} ${statusWord}`
  return (
    <span title={full} className={`badge status-pill status-pill--${tone}`}>
      <Icon name={icon} className="status-pill__icon" />
      {label}
      <span className="visually-hidden">{statusWord}</span>
    </span>
  )
}

export default ActivityBadge
