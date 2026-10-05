import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import EmptyState from 'src/shared/components/EmptyState'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import { fmtMoney } from 'src/shared/utils/format'
import { ORDER_STATUS_CONFIG } from 'src/features/orders/status'
import { useStatusBreakdown } from '../useAnalytics'
import { fmtInt } from '../format'
import BarList from './BarList'
import ReportSection from './ReportSection'

interface StatusBreakdownProps {
  from: string
  to: string
  branchId?: number
  className?: string
}

// A status the registry does not know yet: the API's own word, on the neutral tone.
const statusEntry = (key: string, label: string): StatusConfigEntry =>
  (ORDER_STATUS_CONFIG as Record<string, StatusConfigEntry>)[key] ?? { tone: 'neutral', label }

// Where the period's orders stand now, one row per status. Each status wears the pill it wears on
// every list and record — tone, icon and word — and its bar takes the same tone. The chart this
// replaced kept its own colour map, in which «Confirmada» came out cyan beside a coral badge.
//
// The amount is the sum of the orders' totals, cancelled ones included: what the orders in that
// status are worth, not revenue, so it is never called that here.
const StatusBreakdown = ({ from, to, branchId, className }: StatusBreakdownProps) => {
  const { data, isLoading, isError, isPlaceholderData, refetch } = useStatusBreakdown(
    from,
    to,
    branchId,
  )
  const items = data?.items ?? []

  return (
    <ReportSection
      title="Órdenes por estado"
      caption="Dónde están hoy las órdenes creadas en el período."
      className={className}
      refreshing={isPlaceholderData}
    >
      {isLoading ? (
        <LoadingBlock rows={5} label="Cargando estados…" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : items.every((i) => i.orderCount === 0) ? (
        <EmptyState title="Sin órdenes en el período" />
      ) : (
        <BarList
          label="Órdenes por estado"
          items={items.map((item) => {
            const entry = statusEntry(item.key, item.label)
            return {
              id: item.key,
              label: <StatusBadge config={{ [item.key]: entry }} value={item.key} />,
              value: item.orderCount,
              tone: entry.tone,
              figure: (
                <>
                  <strong>{fmtInt(item.orderCount)}</strong>{' '}
                  <span className="text-body-secondary">· {fmtMoney(item.revenue)}</span>
                </>
              ),
            }
          })}
        />
      )}
    </ReportSection>
  )
}

export default StatusBreakdown
