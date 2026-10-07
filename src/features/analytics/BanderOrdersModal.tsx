import { ACTIVITY_LABEL } from 'src/features/orders/activities'
import EmptyState from 'src/shared/components/EmptyState'
import StatusBadge from 'src/shared/components/StatusBadge'
import { fmtMeters } from 'src/shared/utils/format'
import { UNCLOCKED, workHours, workSpan } from './banderOrders'
import { LedgerItem, LedgerModal, LedgerSection, LedgerSummary } from './components/Ledger'
import { fmtInt, fmtWeekday } from './format'
import { groupByDay } from './ledger'
import { useBanderOrders } from './useAnalytics'

interface BanderOrdersModalProps {
  userId: number | undefined
  from: string
  to: string
  branchId: number | undefined
  onClose: () => void
}

/**
 * The work behind one bander's row: each banding and additional work they closed in the period,
 * with its time — or «Sin tiempo» when Iniciar and Terminar were tapped together after the work.
 * The figures add up to the row by construction.
 */
const BanderOrdersModal = ({ userId, from, to, branchId, onClose }: BanderOrdersModalProps) => {
  const query = useBanderOrders(userId, from, to, branchId)
  const data = query.data
  const f = data?.figures

  return (
    <LedgerModal
      open={userId != null}
      title={data ? `Trabajo de ${data.fullName}` : 'Trabajo del canteador'}
      loading={query.isLoading}
      loadingLabel="Cargando su trabajo…"
      failed={query.isError || !data}
      onRetry={() => void query.refetch()}
      onClose={onClose}
    >
      {data && f && (
        <>
          <LedgerSummary rule="Cuenta para quien pulsó «Terminar», el día del cierre. Los metros son netos, sin el desperdicio que se factura. «Sin tiempo»: iniciada y terminada en menos de un minuto, registrada al final; cuenta como trabajo, pero no suma horas.">
            <strong>
              {fmtInt(f.ordersBanded)} {f.ordersBanded === 1 ? 'canteada' : 'canteadas'}
            </strong>{' '}
            · {fmtMeters(f.bandedLinearM, 0)} netos · {fmtInt(f.ordersAdditional)} con adicionales ·{' '}
            {fmtInt(f.ordersBandedUnclocked + f.ordersAdditionalUnclocked)} sin tiempo
          </LedgerSummary>
          {data.orders.length === 0 ? (
            <EmptyState title="Sin canteado en el período" />
          ) : (
            groupByDay(data.orders, (o) => o.bandedLinearM).map((day) => (
              <LedgerSection
                key={day.day}
                title={`${fmtWeekday(day.day)} · ${fmtMeters(day.sum, 0)} de canteo`}
              >
                {day.items.map((o) => (
                  <LedgerItem
                    key={`${o.orderId}-${o.kind}`}
                    orderId={o.orderId}
                    orderCode={o.orderCode}
                    badges={
                      <>
                        <span className="text-body-secondary">{ACTIVITY_LABEL[o.kind]}</span>
                        {o.hours == null && (
                          <StatusBadge config={{ unclocked: UNCLOCKED }} value="unclocked" />
                        )}
                      </>
                    }
                    figure={workHours(o)}
                    clientName={o.clientName}
                    meta={
                      <>
                        {o.kind === 'banding' && <span>{fmtMeters(o.bandedLinearM, 0)} netos</span>}
                        <span>{workSpan(o)}</span>
                      </>
                    }
                  />
                ))}
              </LedgerSection>
            ))
          )}
        </>
      )}
    </LedgerModal>
  )
}

export default BanderOrdersModal
