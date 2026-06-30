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

import { edgesLabel, fmtMoney } from './format'
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
                  <CTableDataCell>{p.label ?? '—'}</CTableDataCell>
                  <CTableDataCell className="text-end text-nowrap">
                    {p.height} × {p.width}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{p.quantity}</CTableDataCell>
                  <CTableDataCell>{edgesLabel(p.edges)}</CTableDataCell>
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
                    {l.linearM != null && (
                      <div className="text-body-secondary small">
                        {l.linearM} m lineales → se cobran {l.quantity}
                      </div>
                    )}
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
              <div className="fs-5 fw-semibold">
                <span className="text-body-secondary me-2">Total:</span>
                <span>{fmtMoney(data.total, currency)}</span>
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default ReviewSummary
