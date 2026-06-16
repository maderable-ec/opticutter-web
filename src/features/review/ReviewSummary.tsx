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

// Muestra la lista de corte (piezas, no se cobra por pieza) y el detalle de cobro (lines).
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
                  Medida (alto × ancho mm)
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
            <div className="fs-5 fw-semibold">Total: {fmtMoney(data.total, currency)}</div>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default ReviewSummary
