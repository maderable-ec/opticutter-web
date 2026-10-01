import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  // A line under the figure: its unit spelled out, what it is measured against.
  hint?: ReactNode
  // The one tile of a row the eye should land on first (the total of a quote).
  emphasis?: boolean
}

// A headline figure with its label. One tile for the whole app: there were three (the dashboard's
// `StatCard` with a coloured edge per metric, the optimizer's `Kpi` and inline copies in the
// operations panel), and they disagreed on sizes, borders and even on which colour «Merma» was.
// Colour is left out on purpose: a tile states a figure; a verdict on it is a badge next to it.
const StatTile = ({ label, value, hint, emphasis = false }: StatTileProps) => (
  <div className={`stat-tile${emphasis ? ' stat-tile--emphasis' : ''}`}>
    <div className="eyebrow stat-tile__label">{label}</div>
    <div className="stat-tile__value">{value}</div>
    {hint && <div className="stat-tile__hint">{hint}</div>}
  </div>
)

export default StatTile
