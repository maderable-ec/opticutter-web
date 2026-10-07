import EmptyState from 'src/shared/components/EmptyState'
import { relativeTime } from 'src/shared/utils/date'
import { fmtMoney } from 'src/shared/utils/format'
import { LedgerItem, LedgerModal, LedgerSection, LedgerSummary } from './components/Ledger'
import { fmtInt, fmtLocalTime, fmtWeekday } from './format'
import { groupByDay } from './ledger'
import { invoiceLabel, orderDate, paymentBreakdown } from './sellerOrders'
import { useSellerOrders } from './useAnalytics'

interface SellerOrdersModalProps {
  userId: number | undefined
  from: string
  to: string
  branchId: number | undefined
  onClose: () => void
}

/**
 * The orders behind one seller's row: each sale collected in the period, by the day it was paid,
 * with its invoice to cross-check in the accounting system, and what is still to collect today. The
 * sales add up to the row by construction.
 */
const SellerOrdersModal = ({ userId, from, to, branchId, onClose }: SellerOrdersModalProps) => {
  const query = useSellerOrders(userId, from, to, branchId)
  const data = query.data
  const f = data?.figures

  return (
    <LedgerModal
      open={userId != null}
      title={data ? `Ventas de ${data.fullName}` : 'Ventas del vendedor'}
      loading={query.isLoading}
      loadingLabel="Cargando sus ventas…"
      failed={query.isError || !data}
      onRetry={() => void query.refetch()}
      onClose={onClose}
    >
      {data && f && (
        <>
          <LedgerSummary rule="Una venta cuenta el día de su cobro (cuando la orden pasa a la cola) para quien hizo la cotización, aunque la orden sea de otro día. Efectivo incluye transferencia; las canceladas no cuentan.">
            Cobró <strong>{fmtMoney(f.total)}</strong> en {fmtInt(f.paidOrders)}{' '}
            {f.paidOrders === 1 ? 'orden' : 'órdenes'} · efectivo {fmtMoney(f.cash)} · crédito{' '}
            {fmtMoney(f.credit)}
          </LedgerSummary>
          {data.paid.length === 0 ? (
            <EmptyState title="Sin cobros en el período" />
          ) : (
            groupByDay(data.paid, (o) => o.total).map((day) => (
              <LedgerSection key={day.day} title={`${fmtWeekday(day.day)} · ${fmtMoney(day.sum)}`}>
                {day.items.map((o) => (
                  <LedgerItem
                    key={o.orderId}
                    orderId={o.orderId}
                    orderCode={o.orderCode}
                    figure={fmtMoney(o.total)}
                    clientName={o.clientName}
                    meta={
                      <>
                        <span>{paymentBreakdown(o)}</span>
                        <span>cobrada {fmtLocalTime(o.paidAt)}</span>
                        {orderDate(o) && <span>{orderDate(o)}</span>}
                        <span>{invoiceLabel(o)}</span>
                      </>
                    }
                  />
                ))}
              </LedgerSection>
            ))
          )}
          {data.pending.length > 0 && (
            <LedgerSection title={`Por cobrar hoy · ${fmtMoney(f.pendingAmount)}`}>
              {data.pending.map((o) => (
                <LedgerItem
                  key={o.orderId}
                  orderId={o.orderId}
                  orderCode={o.orderCode}
                  figure={fmtMoney(o.total)}
                  clientName={o.clientName}
                  meta={
                    <span>
                      {o.confirmedAt
                        ? `confirmada ${relativeTime(o.confirmedAt)}`
                        : 'confirmada, sin pago'}
                    </span>
                  }
                />
              ))}
            </LedgerSection>
          )}
        </>
      )}
    </LedgerModal>
  )
}

export default SellerOrdersModal
