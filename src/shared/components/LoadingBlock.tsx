import { CPlaceholder } from '@coreui/react'

interface LoadingBlockProps {
  // `list`: rows of a listing. `cards`: the workshop board's tiles. `detail`: a record's header and
  // its first section.
  variant?: 'list' | 'cards' | 'detail'
  rows?: number
  // What is loading, for a screen reader: the shapes say "loading" to the eye only.
  label?: string
}

// Widths cycled through so the skeleton looks like text and not like a grid of identical bars.
const WIDTHS = [7, 9, 5, 8, 6, 10, 4]

// A skeleton of what is about to appear, in place of a lone spinner in the middle of the page: the
// layout stops jumping when the data lands, and the wait reads as "this list is coming", not as
// "something is happening somewhere".
const LoadingBlock = ({ variant = 'list', rows = 6, label = 'Cargando…' }: LoadingBlockProps) => (
  <div role="status" aria-live="polite" className={`loading-block loading-block--${variant}`}>
    <span className="visually-hidden">{label}</span>
    {variant === 'detail' && (
      <div className="loading-block__head" aria-hidden="true">
        <CPlaceholder as="div" animation="glow">
          <CPlaceholder xs={4} size="lg" />
        </CPlaceholder>
        <CPlaceholder as="div" animation="glow">
          <CPlaceholder xs={7} size="sm" />
        </CPlaceholder>
      </div>
    )}
    <div className="loading-block__items" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <CPlaceholder key={i} as="div" animation="glow" className="loading-block__item">
          <CPlaceholder xs={WIDTHS[i % WIDTHS.length] ?? 6} />
          {variant !== 'list' && <CPlaceholder xs={12} size="sm" />}
          {variant === 'cards' && <CPlaceholder xs={5} size="lg" />}
        </CPlaceholder>
      ))}
    </div>
  </div>
)

export default LoadingBlock
