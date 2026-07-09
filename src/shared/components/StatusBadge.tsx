import { CBadge } from '@coreui/react'

export interface StatusConfigEntry {
  color: string
  label: string
}

interface StatusBadgeProps {
  // Maps each status value to its badge color and label.
  config: Record<string, StatusConfigEntry>
  value: string
  // Color used when `value` is not in `config` (label falls back to the raw value).
  fallbackColor?: string
}

// Generic colored status badge shared by orders, pre-orders, roles, actors, product types, …
// Each feature keeps a thin typed wrapper that supplies its own `config` for call-site safety.
const StatusBadge = ({ config, value, fallbackColor = 'secondary' }: StatusBadgeProps) => {
  const entry = config[value] ?? { color: fallbackColor, label: value }
  return <CBadge color={entry.color}>{entry.label}</CBadge>
}

export default StatusBadge
