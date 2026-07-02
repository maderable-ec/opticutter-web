import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalculator } from '@coreui/icons'

import { fmtMoney } from 'src/features/review/format'
import PricingBlock from 'src/shared/components/PricingBlock'
import { stripHalfSuffix } from 'src/shared/utils/halfBoard'
import type { OptimizeResponse } from './types'
import CutLayoutDiagram from './CutLayoutDiagram'

interface OptimizationPreviewProps {
  result?: OptimizeResponse
  isPending: boolean
  error?: Error | null
  // When provided, the header shows an "Optimizar" button (used by pre-orders as Save+Recalculate).
  // The optimizer omits it and triggers optimization from its sticky action bar instead.
  canOptimize?: boolean
  onOptimize?: () => void
}

const meters = (n?: number | null) => (n != null ? `${n.toFixed(2)} m` : '—')

interface KpiProps {
  label: string
  value: string | number
}

// Compact KPI tile with a subtle border, so the four headline metrics read as a scannable group.
const Kpi = ({ label, value }: KpiProps) => (
  <CCol xs={6} md={3}>
    <div className="border rounded-3 p-2 h-100">
      <div className="text-body-secondary small text-uppercase">{label}</div>
      <div className="fs-5 fw-semibold">{value}</div>
    </div>
  </CCol>
)

const OptimizationPreview = ({
  result,
  isPending,
  error,
  canOptimize,
  onOptimize,
}: OptimizationPreviewProps) => {
  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Vista previa de optimización</strong>
        {onOptimize ? (
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            disabled={!canOptimize || isPending}
            onClick={onOptimize}
          >
            {isPending ? (
              <CSpinner size="sm" />
            ) : (
              <>
                <CIcon icon={cilCalculator} className="me-1" />
                Optimizar
              </>
            )}
          </CButton>
        ) : (
          isPending && (
            <span className="text-body-secondary small d-flex align-items-center gap-2">
              <CSpinner size="sm" />
              Optimizando…
            </span>
          )
        )}
      </CCardHeader>
      <CCardBody>
        {error && (
          <CAlert color="danger" className="py-2 small mb-3">
            {error.message || 'Error al optimizar. Intente nuevamente.'}
          </CAlert>
        )}
        {!result && !error && (
          <div className="text-body-secondary small">
            Define materiales y piezas, luego presiona “Optimizar” para ver tableros, costo,
            eficiencia y el diagrama de cortes — sin crear nada.
          </div>
        )}
        {result && (
          <>
            <CRow className="g-2 mb-3">
              <Kpi label="Tableros usados" value={result.totalBoardsUsed} />
              <Kpi
                label="Costo estimado"
                value={fmtMoney((result.totalBoardsCost ?? 0) + (result.totalEdgeBandingCost ?? 0))}
              />
              <Kpi label="Corte lineal" value={meters(result.totalCutLinearM)} />
              <Kpi label="Tapacanto lineal" value={meters(result.totalEdgeBandingLinearM)} />
            </CRow>

            {result.pricing && (
              <div className="mb-3">
                <PricingBlock pricing={result.pricing} />
              </div>
            )}

            {result.materialsSummary?.length > 0 && (
              <CTable small responsive className="mb-3">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">Material</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Medida</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">
                      Tableros
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">
                      Efic. avg
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">Costo</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {result.materialsSummary.map((m) => (
                    <CTableRow key={m.materialKey}>
                      <CTableDataCell>
                        {stripHalfSuffix(m.productName) ?? m.productCode ?? m.materialKey}{' '}
                        {m.halfBoard && <CBadge color="info">½ medio</CBadge>}
                      </CTableDataCell>
                      <CTableDataCell className="text-nowrap">
                        {m.width}×{m.height}×{m.thickness} mm
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{m.count}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {m.avgEfficiency != null ? `${m.avgEfficiency.toFixed(1)}%` : '—'}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{fmtMoney(m.totalCost)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}

            {result.edgeBandingsSummary?.length > 0 && (
              <CTable small responsive className="mb-3">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">Tapacanto</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">
                      m netos
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">
                      m facturados
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">
                      Precio/m
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">Costo</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {result.edgeBandingsSummary.map((e) => (
                    <CTableRow key={e.productId ?? 'sin-producto'}>
                      <CTableDataCell>
                        {e.productName ?? e.productCode ?? 'Sin asignar'}
                        {e.color ? <span className="text-body-secondary"> · {e.color}</span> : null}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        {e.netLinearM.toFixed(2)}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{e.billedLinearM}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {e.pricePerM ? fmtMoney(e.pricePerM) : '—'}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        {e.totalCost ? fmtMoney(e.totalCost) : '—'}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}

            <CutLayoutDiagram
              layoutGroups={result.layoutGroups}
              materialsSummary={result.materialsSummary}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default OptimizationPreview
