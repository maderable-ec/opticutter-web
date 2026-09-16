import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { fmtMoney } from 'src/shared/utils/format'
import LineItemList from './LineItemList'
import type { AdditionalServiceInput } from 'src/features/optimizer/types'

// What the order bills BESIDES the material: perforación, armado, bisagras — the work the
// canteador also does, and the third of the order's parallel activities. The lines have travelled
// in `OrderResponse.additionalServices` all along (a property over the frozen snapshot); the
// detail page printed only their rolled-up total inside the money block, so an order could say
// "Servicios adicionales $18.40" and never say what they were.
//
// Two things about the money here, and they disagree on purpose:
//
//   * `unitPrice` is the price the counter TYPED, tax INCLUDED — that is how the service price
//     list is written, and it is the one price in the system that works that way.
//   * `additionalServicesTotal`, the figure in the totals block, is NET: the server divides each
//     line by `1 + taxRate` so the document closes with a single IVA line.
//
// So this table prints what was registered, says so in the column header, and closes with its own
// tax-included total. It deliberately does NOT divide by `1 + taxRate` to "reconcile" with the
// block below: the server already did that arithmetic, and Python's rounding and JS's disagree by
// a cent — a table that quietly recomputed the number would eventually contradict the invoice.
//
// `lineTotal` is not on the wire either (`AdditionalServiceLine` carries no such field), so it is
// the plain product, the same one the public review computes.

interface OrderServicesTableProps {
  services: AdditionalServiceInput[]
}

const OrderServicesTable = ({ services }: OrderServicesTableProps) => {
  if (services.length === 0) return null

  const total = services.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0)

  return (
    <>
      {/* Phone: a stacked list, as in `OrderBoardsTable`. Same money rules as the table: the
          tax-included price as typed, and a closing total only under more than one line. */}
      <LineItemList
        className="d-md-none"
        items={services.map((s, i) => ({
          key: s.serviceId ?? i,
          title: s.name,
          detail: `${s.quantity} × ${fmtMoney(s.unitPrice)} c/IVA`,
          amount: fmtMoney(s.unitPrice * s.quantity),
        }))}
        footer={
          services.length > 1 ? { label: 'Total con IVA', amount: fmtMoney(total) } : undefined
        }
      />
      <div className="d-none d-md-block">
        <CTable small responsive hover className="summary-table mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Servicio</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Cant.</CTableHeaderCell>
              <CTableHeaderCell className="text-end" title="IVA incluido">
                P. unit. (c/IVA)
              </CTableHeaderCell>
              <CTableHeaderCell className="text-end">Total línea</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {services.map((s, i) => (
              // No stable id: `serviceId` is optional (the catalog entry may be gone) and two lines
              // can name the same service. The list is read-only and never reordered, so the index
              // is the identity — same call the pieces table makes.
              <CTableRow key={s.serviceId ?? i}>
                <CTableDataCell>{s.name}</CTableDataCell>
                <CTableDataCell className="text-end">{s.quantity}</CTableDataCell>
                <CTableDataCell className="text-end">{fmtMoney(s.unitPrice)}</CTableDataCell>
                <CTableDataCell className="text-end">
                  {fmtMoney(s.unitPrice * s.quantity)}
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
          {/* Only worth a total under more than one row: under a single one it just restates it. */}
          {services.length > 1 && (
            <CTableFoot>
              <CTableRow>
                <CTableDataCell colSpan={3} className="text-end text-body-secondary">
                  Total con IVA
                </CTableDataCell>
                <CTableDataCell className="text-end fw-semibold">{fmtMoney(total)}</CTableDataCell>
              </CTableRow>
            </CTableFoot>
          )}
        </CTable>
      </div>
    </>
  )
}

export default OrderServicesTable
