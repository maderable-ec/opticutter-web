import Icon from 'src/shared/icons/Icon'
import type { IconName } from 'src/shared/icons/registry'

/**
 * What a badge MEANS, never which colour it is: each tone maps to a soft fill and an ink that clears
 * 4.5:1 on it, in both themes (`--mb-tone-*` in `_tokens.scss`).
 *
 * - `neutral`: waiting, a draft, a category with no weight.
 * - `info`: something happened and nothing is expected of us yet (sent, confirmed by the client).
 * - `progress`: work under way, or a point that needs a look (in process, changes requested).
 * - `success`: done.
 * - `danger`: ended badly (cancelled, rejected, out of stock).
 * - `graphite`: closed and archived (dispatched).
 */
export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'danger' | 'graphite'

export interface StatusConfigEntry {
  label: string
  tone: StatusTone
  // A STATE carries an icon, so it is told by shape as well as by colour and word; a CATEGORY (a
  // role, a product type) has no state to draw and leaves it out.
  icon?: IconName
}

interface StatusBadgeProps {
  // Maps each value to its label, tone and icon.
  config: Record<string, StatusConfigEntry>
  value: string
  // Tone used when `value` is not in `config` (the label falls back to the raw value).
  fallbackTone?: StatusTone
  className?: string
}

// Shared by orders, pre-orders, activities, roles, actors, product and band types. Each feature
// keeps a thin typed wrapper that supplies its own `config` for call-site safety.
const StatusBadge = ({ config, value, fallbackTone = 'neutral', className }: StatusBadgeProps) => {
  const entry = config[value] ?? { tone: fallbackTone, label: value }
  return (
    <span
      className={`badge status-pill status-pill--${entry.tone}${className ? ` ${className}` : ''}`}
    >
      {entry.icon && <Icon name={entry.icon} className="status-pill__icon" />}
      {entry.label}
    </span>
  )
}

export default StatusBadge
