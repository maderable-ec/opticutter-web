import { useId } from 'react'
import type { ReactNode } from 'react'
import { CButton } from '@coreui/react'

interface SectionProps {
  title: ReactNode
  // One line under the title: what the figures count, when the title alone would mislead.
  caption?: ReactNode
  // At the right of the title: the way to the whole list («Ver todas ›»), or the control that
  // belongs to this block alone (a metric). Rendered as is, so it brings its own width rules.
  action?: ReactNode
  // The previous content on screen while the new one loads: dimmed rather than swapped for a
  // skeleton, so changing a filter does not make the page jump.
  refreshing?: boolean
  // Some of the block's requests failed: said under it, with a retry.
  failed?: boolean
  onRetry?: () => void
  className?: string
  children: ReactNode
}

// One block of a screen made of independent blocks (Inicio, the reports, Configuración): a
// `.surface` titled by an eyebrow `h2`. The three screens used to carry a copy each, with three
// head layouts and three bottom margins.
const Section = ({
  title,
  caption,
  action,
  refreshing = false,
  failed = false,
  onRetry,
  className = '',
  children,
}: SectionProps) => {
  const id = useId()
  return (
    <section
      className={`surface section${refreshing ? ' is-refreshing' : ''} ${className}`}
      aria-labelledby={id}
      aria-busy={refreshing || undefined}
    >
      <div className="section__head">
        <div className="section__titles">
          <h2 id={id} className="eyebrow mb-0">
            {title}
          </h2>
          {caption && <p className="section__caption">{caption}</p>}
        </div>
        {action}
      </div>
      {children}
      {failed && (
        <p className="section__error" role="alert">
          No se pudieron cargar algunos datos.
          {onRetry && (
            <CButton color="link" size="sm" className="p-0 ms-1 align-baseline" onClick={onRetry}>
              Reintentar
            </CButton>
          )}
        </p>
      )}
    </section>
  )
}

export default Section
