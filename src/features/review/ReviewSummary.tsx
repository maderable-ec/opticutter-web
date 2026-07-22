import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import CantoPreview from 'src/shared/components/CantoPreview'
import { cantoNotation, cantoSides, edgesLabel, fmtMoney } from './format'
import type { ReviewPreOrder } from './types'

interface ReviewSummaryProps {
  data: ReviewPreOrder
}

// Displays the cut list (pieces, not billed per piece) and the billing detail (lines).
const ReviewSummary = ({ data }: ReviewSummaryProps) => {
  const currency = data.currency ?? 'USD'

  return (
    <>
      <CCard className="mb-3">
        <CCardHeader>
          <strong>Piezas (lista de corte)</strong>
        </CCardHeader>
        <CCardBody>
          <CTable small responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="bg-body-tertiary text-end">#</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary">Material</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary">Etiqueta</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">
                  Medida (largo × ancho mm)
                </CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">Cant.</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary">Cantos</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {data.pieces?.map((p, i) => (
                <CTableRow key={i}>
                  <CTableDataCell className="text-end text-body-secondary">{i + 1}</CTableDataCell>
                  <CTableDataCell>{p.materialName ?? p.materialCode ?? '—'}</CTableDataCell>
                  <CTableDataCell>{p.label ?? '—'}</CTableDataCell>
                  <CTableDataCell className="text-end text-nowrap">
                    {p.height} × {p.width}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{p.quantity}</CTableDataCell>
                  <CTableDataCell>
                    {p.edges?.sides?.length ? (
                      <div className="d-flex align-items-center gap-2" title={edgesLabel(p.edges)}>
                        <CantoPreview sides={cantoSides(p.edges)} />
                        <span className="text-nowrap">{cantoNotation(p.edges)}</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      <CCard className="mb-3">
        <CCardHeader>
          <strong>Detalle de cobro</strong>
        </CCardHeader>
        <CCardBody>
          <CTable small responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="bg-body-tertiary">Producto</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">Cant.</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">
                  Precio unit.
                </CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">Total</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {data.lines?.map((l, i) => (
                <CTableRow key={i}>
                  <CTableDataCell>
                    <div>{l.productName ?? '—'}</div>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{l.quantity}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {fmtMoney(l.unitPrice, currency)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {fmtMoney(l.lineTotal, currency)}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
          <div className="d-flex justify-content-end mt-2">
            <div className="d-flex flex-column align-items-end gap-1 small">
              <div>
                <span className="text-body-secondary me-2">Subtotal:</span>
                <span>{fmtMoney(data.subtotal, currency)}</span>
              </div>
              {(data.discountAmount ?? 0) !== 0 && (
                <div>
                  <span className="text-body-secondary me-2">
                    Descuento {data.priceTierName} (-{Math.round((data.discountRate ?? 0) * 100)}%):
                  </span>
                  <span className="text-danger">-{fmtMoney(data.discountAmount, currency)}</span>
                </div>
              )}
              {!!data.servicesTotal && (
                <div>
                  <span className="text-body-secondary me-2">Servicios adicionales:</span>
                  <span>{fmtMoney(data.servicesTotal, currency)}</span>
                </div>
              )}
              <div className="fs-5 fw-semibold">
                <span className="text-body-secondary me-2">Total:</span>
                <span>{fmtMoney(data.total, currency)}</span>
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {!!data.additionalServices?.length && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Servicios adicionales</strong>
          </CCardHeader>
          <CCardBody>
            <CTable small responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Servicio</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Cant.</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Precio unit.
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Total</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.additionalServices.map((s, i) => (
                  <CTableRow key={i}>
                    <CTableDataCell>{s.name}</CTableDataCell>
                    <CTableDataCell className="text-end">{s.quantity}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {fmtMoney(s.unitPrice, currency)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {fmtMoney(s.lineTotal, currency)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default ReviewSummary
