import EmptyState from 'src/shared/components/EmptyState'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import { fmtMoney } from 'src/shared/utils/format'
import { useBranchBreakdown } from '../useAnalytics'
import { fmtInt } from '../format'
import BarList from './BarList'
import ReportSection from './ReportSection'

interface BranchBreakdownProps {
  from: string
  to: string
  // The branch the rest of the page is filtered to: marked here, since this block shows them all.
  branchId?: number
  className?: string
}

// The branches side by side. Always all of them — a comparison of one is not a comparison — so
// with a branch picked above, this is the one block the filter does not narrow, and it says so.
const BranchBreakdown = ({ from, to, branchId, className }: BranchBreakdownProps) => {
  const { data, isLoading, isError, isPlaceholderData, refetch } = useBranchBreakdown(from, to)
  const items = data?.items ?? []

  return (
    <ReportSection
      title="Por sucursal"
      caption={
        branchId
          ? 'Todas las sucursales, para comparar con la elegida.'
          : 'Órdenes creadas en el período en cada sucursal.'
      }
      className={className}
      refreshing={isPlaceholderData}
    >
      {isLoading ? (
        <LoadingBlock rows={3} label="Cargando sucursales…" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : items.every((i) => i.orderCount === 0) ? (
        <EmptyState title="Sin órdenes en el período" />
      ) : (
        <BarList
          label="Órdenes por sucursal"
          items={items.map((item) => ({
            id: item.key,
            label: item.label,
            value: item.orderCount,
            current: branchId !== undefined && item.key === String(branchId),
            figure: (
              <>
                <strong>{fmtInt(item.orderCount)}</strong>{' '}
                <span className="text-body-secondary">· {fmtMoney(item.revenue)}</span>
              </>
            ),
          }))}
        />
      )}
    </ReportSection>
  )
}

export default BranchBreakdown
