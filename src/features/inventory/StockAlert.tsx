import { CAlert } from '@coreui/react'

import { useStockCheck } from './useStockCheck'
import type { StockAlertItem, StockCheckItem, StockUnit } from './types'

// Material that is running out in the branch the job belongs to. Informational
// on purpose: it never disables a button and never blocks a save. The seller
// decides whether to quote it anyway, swap the board, or call the warehouse.
// (Its model, `optimizer/UnplacedPiecesAlert`, no longer is: a piece the plan
// does not cut blocks the quote.)
//
// Rendered above the money, not below it, because it changes what to do next
// rather than describing what was decided.

interface Props {
  branchId: number | null
  items: StockCheckItem[]
}

// Sheets are whole units; metres are not. Printing "3.0 láminas" or "12 m" when
// the warehouse says 12.5 both read as wrong.
const amount = (value: number, unit: StockUnit) =>
  unit === 'sheets'
    ? `${Number.isInteger(value) ? value : value.toFixed(1)} ${value === 1 ? 'lámina' : 'láminas'}`
    : `${value.toFixed(1)} m`

const label = (alert: StockAlertItem) =>
  alert.productName ?? alert.productCode ?? `Producto ${alert.productId}`

const reason = (alert: StockAlertItem) => {
  const available = amount(alert.available, alert.unit)
  const required = amount(alert.required, alert.unit)
  // The urgent half first: not covering the job is a different problem from
  // sitting under a purchasing floor, and only one of them stops the cut.
  if (alert.insufficient) {
    return `hay ${available} y este pedido necesita ${required}`
  }
  return `quedan ${available} (mínimo ${amount(alert.threshold, alert.unit)})`
}

const StockAlert = ({ branchId, items }: Props) => {
  const { data } = useStockCheck(branchId, items)

  // Nothing to say: no branch yet, the branch has no warehouse configured, the
  // vendor's system did not answer, or everything is well stocked. None of
  // those is worth a red box next to a quote.
  if (!data?.checked || data.alerts.length === 0) return null

  const short = data.alerts.filter((a) => a.insufficient).length
  const branch = data.branch?.name

  return (
    <CAlert color="warning" className="py-2">
      <div className="fw-semibold mb-1">
        {data.alerts.length === 1
          ? 'Un material con stock bajo'
          : `${data.alerts.length} materiales con stock bajo`}
        {branch ? ` en ${branch}` : ''}
      </div>
      <ul className="mb-1 ps-3 small">
        {data.alerts.map((alert) => (
          <li key={alert.productId}>
            <strong>{label(alert)}</strong> — {reason(alert)}
          </li>
        ))}
      </ul>
      <div className="small text-body-secondary">
        {short > 0
          ? 'La bodega no alcanza a cubrir el pedido: confirma con el almacén antes de comprometer una fecha.'
          : 'Es un aviso de reposición. La cotización se puede emitir igual.'}
      </div>
    </CAlert>
  )
}

export default StockAlert
