import type { ReactNode } from 'react'

// A billing table as a stacked list, for a phone. `OrderBoardsTable` runs seven columns and
// scrolled sideways below `md`, with the line total — the one number anybody reads on a phone —
// past the right edge. Each table mounts this beside itself and the breakpoint picks one;
// presentational only, so the tables keep owning what their lines say. Born in the order detail;
// the optimizer's Costos step reads its plan the same way.
//
// Per row: what it is, then how it adds up on the left and the amount on the right, then the
// reference data (code, efficiency) small and muted, and last whatever the line lets you decide.

export interface LineItem {
  key: string | number
  title: ReactNode
  // "3 × $45.20" — the arithmetic behind the amount.
  detail: ReactNode
  // Reference data nobody needs to settle the amount.
  meta?: ReactNode
  amount: ReactNode
  // What the line lets you decide (the Costos marks: Nivel, Entero), as visible labelled controls:
  // in the table they are checkbox columns whose header says what they mean, and a row of a list
  // has no header to lean on.
  controls?: ReactNode
}

interface LineItemListProps {
  items: LineItem[]
  // Closing total, when the table it stands for closes with one.
  footer?: { label: ReactNode; amount: ReactNode }
  className?: string
}

const LineItemList = ({ items, footer, className = '' }: LineItemListProps) => (
  <div className={`line-items ${className}`}>
    {items.map((item) => (
      <div key={item.key} className="line-item">
        <div className="fw-semibold">{item.title}</div>
        <div className="d-flex align-items-baseline gap-2 small">
          <span className="text-body-secondary">{item.detail}</span>
          <span className="ms-auto fw-semibold text-nowrap">{item.amount}</span>
        </div>
        {item.meta && <div className="text-body-secondary small">{item.meta}</div>}
        {item.controls && <div className="line-item__controls">{item.controls}</div>}
      </div>
    ))}
    {footer && (
      <div className="d-flex align-items-baseline gap-2 small px-1 pt-2">
        <span className="text-body-secondary">{footer.label}</span>
        <span className="ms-auto fw-semibold text-nowrap">{footer.amount}</span>
      </div>
    )}
  </div>
)

export default LineItemList
