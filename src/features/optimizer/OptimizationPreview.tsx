import {
  CAlert,
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
import type { OptimizeResponse } from './types'
import CutLayoutDiagram from './CutLayoutDiagram'

interface OptimizationPreviewProps {
  result?: OptimizeResponse
  isPending: boolean
  error?: Error | null
  canOptimize: boolean
  onOptimize: () => void
}

const meters = (n?: number | null) => (n != null ? `${n.toFixed(2)} m` : '—')

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
      </CCardHeader>
      <CCardBody>
        {error && (
          <CAlert color="danger" className="py-2 small mb-3">
            {error.message || 'Error al optimizar. Intente nuevamente.'}
          </CAlert>
        )}
        {!result && !error && (
          <div className="text-body-secondary small">
            Definí materiales y piezas, luego presioná “Optimizar” para ver tableros, costo,
            eficiencia y el diagrama de cortes — sin crear nada.
          </div>
        )}
        {result && (
          <>
            <CRow className="g-3 mb-3">
              <CCol xs={6} md={3}>
                <div className="text-body-secondary small">Tableros usados</div>
                <div className="fs-5 fw-semibold">{result.totalBoardsUsed}</div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="text-body-secondary small">Costo estimado</div>
                <div className="fs-5 fw-semibold">
                  {fmtMoney((result.totalBoardsCost ?? 0) + (result.totalEdgeBandingCost ?? 0))}
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="text-body-secondary small">Corte lineal</div>
                <div className="fs-5 fw-semibold">{meters(result.totalCutLinearM)}</div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="text-body-secondary small">Tapacanto lineal</div>
                <div className="fs-5 fw-semibold">{meters(result.totalEdgeBandingLinearM)}</div>
              </CCol>
            </CRow>

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
                        {m.productName ?? m.productCode ?? m.materialKey}
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
                    <CTableRow key={e.productId}>
                      <CTableDataCell>
                        {e.productName ?? e.productCode}
                        {e.color ? <span className="text-body-secondary"> · {e.color}</span> : null}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        {e.netLinearM.toFixed(2)}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{e.billedLinearM}</CTableDataCell>
                      <CTableDataCell className="text-end">{fmtMoney(e.pricePerM)}</CTableDataCell>
                      <CTableDataCell className="text-end">{fmtMoney(e.totalCost)}</CTableDataCell>
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
