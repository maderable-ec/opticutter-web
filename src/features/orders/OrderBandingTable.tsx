import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { fmtMoney } from 'src/shared/utils/format'
import type { OrderLine } from './types'

// The edge-banding half of the billing snapshot, billed by the metre. Sibling of
// `OrderBoardsTable`; see its header for why the two are separate tables.
//
// The metres are the BILLED ones — net plus the waste factor, computed server-side and frozen
// here — which is why they carry decimals and why the column says "Metros" rather than "Cant.".
// `linearM` and `quantity` hold the same number by contract; the first is the one that names it.

interface OrderBandingTableProps {
  lines: OrderLine[]
}

const OrderBandingTable = ({ lines }: OrderBandingTableProps) => {
  if (lines.length === 0) return null

  return (
    <CTable small responsive hover className="summary-table mb-0">
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>Tapacanto</CTableHeaderCell>
          <CTableHeaderCell>Código</CTableHeaderCell>
          <CTableHeaderCell className="text-end">Metros</CTableHeaderCell>
          <CTableHeaderCell className="text-end">Precio/m</CTableHeaderCell>
          <CTableHeaderCell className="text-end">Total línea</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {lines.map((l) => (
          <CTableRow key={l.id}>
            <CTableDataCell>{l.productName ?? '—'}</CTableDataCell>
            <CTableDataCell>{l.productCode ?? '—'}</CTableDataCell>
            <CTableDataCell className="text-end">
              {(l.linearM ?? l.quantity).toFixed(2)} m
            </CTableDataCell>
            <CTableDataCell className="text-end">{fmtMoney(l.unitPriceSnapshot)}</CTableDataCell>
            <CTableDataCell className="text-end">{fmtMoney(l.lineTotal)}</CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  )
}

export default OrderBandingTable
