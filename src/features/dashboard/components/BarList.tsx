import type { CSSProperties, ReactNode } from 'react'
import type { StatusTone } from 'src/shared/components/StatusBadge'

export interface BarListItem {
  id: string
  // What the row is: a status pill, a branch, a stage.
  label: ReactNode
  // Next to the label: a verdict on the row («Cuello de botella»).
  badge?: ReactNode
  // Length of the bar, on the list's scale.
  value: number
  // Where a lighter wash of the bar runs on to (a stage's p90 past its median).
  extent?: number
  // The figure the row is about, printed: the bar is never the only way to read it.
  figure: ReactNode
  // One muted line under the bar.
  detail?: ReactNode
  // The bar's colour: a status's tone, or the technical accent when the rows are just names.
  tone?: StatusTone
  // The row the rest of the page is about (the branch the filter picked).
  current?: boolean
}

interface BarListProps {
  items: BarListItem[]
  // What the rows are, for a screen reader («Órdenes por estado»).
  label: string
}

const pct = (value: number, max: number) => (max > 0 ? Math.max(0, (value / max) * 100) : 0)

// A handful of rows compared by size: a horizontal bar per row, drawn in HTML rather than on a
// canvas. The rows it replaced were Chart.js bars that said their revenue only in a hover tooltip,
// which a phone never shows, and that a screen reader met as an unlabelled image. Here every row
// states its figure in text, the bar only shows it at a glance, and the list reads as a list.
const BarList = ({ items, label }: BarListProps) => {
  const max = Math.max(0, ...items.map((i) => Math.max(i.value, i.extent ?? 0)))
  return (
    <ul className="bar-list" aria-label={label}>
      {items.map((item) => (
        <li
          key={item.id}
          className={`bar-list__row${item.current ? ' is-current' : ''}`}
          aria-current={item.current || undefined}
        >
          <div className="bar-list__head">
            <span className="bar-list__label">
              {item.label}
              {item.badge}
            </span>
            <span className="bar-list__figure">{item.figure}</span>
          </div>
          <div
            className={`bar-list__track bar-list__track--${item.tone ?? 'tech'}`}
            aria-hidden="true"
          >
            {item.extent !== undefined && item.extent > item.value && (
              <span
                className="bar-list__extent"
                style={
                  {
                    '--bar-start': `${pct(item.value, max)}%`,
                    '--bar-size': `${pct(item.extent - item.value, max)}%`,
                  } as CSSProperties
                }
              />
            )}
            {item.value > 0 && (
              <span
                className="bar-list__bar"
                style={{ '--bar-size': `${pct(item.value, max)}%` } as CSSProperties}
              />
            )}
          </div>
          {item.detail && <div className="bar-list__detail">{item.detail}</div>}
        </li>
      ))}
    </ul>
  )
}

export default BarList
