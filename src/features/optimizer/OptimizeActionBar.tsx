import { CButton, CButtonGroup, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalculator, cilCart } from '@coreui/icons'

import type { PackingStrategy } from './types'

interface OptimizeActionBarProps {
  strategy: PackingStrategy
  onStrategyChange: (s: PackingStrategy) => void
  canOptimize: boolean
  isPending: boolean
  hasResult: boolean
  onOptimize: () => void
  onCreateQuote: () => void
}

const OPTIONS: { value: PackingStrategy; label: string }[] = [
  { value: 'longOffcuts', label: 'Retazos largos' },
  { value: 'default', label: 'Máxima eficiencia' },
]

// Sticky action bar pinned to the bottom of the viewport: keeps the cut heuristic and the primary
// "Optimizar" action always visible, regardless of how long the pieces list gets.
const OptimizeActionBar = ({
  strategy,
  onStrategyChange,
  canOptimize,
  isPending,
  hasResult,
  onOptimize,
  onCreateQuote,
}: OptimizeActionBarProps) => (
  <div style={{ position: 'sticky', bottom: 0, zIndex: 1020 }} className="mb-3">
    <div className="d-flex flex-wrap align-items-center gap-3 p-2 border rounded-3 bg-body shadow-sm">
      <div>
        <div className="small text-body-secondary fw-semibold text-uppercase mb-1">
          Heurística de corte
        </div>
        <CButtonGroup size="sm" role="group" aria-label="Heurística de corte">
          {OPTIONS.map((o) => {
            const active = strategy === o.value
            return (
              <CButton
                key={o.value}
                type="button"
                color="primary"
                variant={active ? undefined : 'outline'}
                active={active}
                disabled={isPending}
                onClick={() => onStrategyChange(o.value)}
              >
                {o.label}
              </CButton>
            )
          })}
        </CButtonGroup>
      </div>

      <div className="text-body-secondary small d-none d-lg-block" style={{ maxWidth: 260 }}>
        Retazos largos: agrupa el sobrante en una tira larga reutilizable.
      </div>

      <div className="ms-auto d-flex align-items-center gap-2">
        {hasResult && (
          <CButton color="secondary" variant="outline" type="button" onClick={onCreateQuote}>
            <CIcon icon={cilCart} className="me-1" />
            Crear cotización
          </CButton>
        )}
        <CButton
          color="primary"
          size="lg"
          type="button"
          disabled={!canOptimize || isPending}
          onClick={onOptimize}
        >
          {isPending ? (
            <CSpinner size="sm" className="me-1" />
          ) : (
            <CIcon icon={cilCalculator} className="me-1" />
          )}
          Optimizar
        </CButton>
      </div>
    </div>
  </div>
)

export default OptimizeActionBar
