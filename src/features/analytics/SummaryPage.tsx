import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import StatTile from 'src/shared/components/StatTile'
import { fmtMeters, fmtMoney, fmtNumber } from 'src/shared/utils/format'
import ProductionStatus from 'src/features/orders/ProductionStatus'
import BranchComparisonTable from './components/BranchComparisonTable'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import { SUMMARY_GROUPS } from './comparisonRows'
import { fmtDecimal, fmtInt } from './format'
import { useBranchComparison } from './useAnalytics'
import { useReportFilters } from './useReportFilters'

// Resumen: the branches side by side, for the admin to read in a few seconds which one sells more,
// produces more and does it faster. No branch filter — the comparison IS every branch — and no
// charts: the figures are what the admin came for.
const SummaryPage = () => {
  const filters = useReportFilters()
  const { from, to } = filters
  const { data, isLoading, isError, isPlaceholderData, refetch } = useBranchComparison(from, to)
  const total = data?.total

  return (
    <div className="report">
      <ReportFilters filters={filters} branch={false} />

      <ReportSection title="Ahora">
        <ProductionStatus />
      </ReportSection>

      {isLoading ? (
        <ReportSection title="Período">
          <LoadingBlock variant="cards" rows={6} label="Cargando el período…" />
        </ReportSection>
      ) : isError || !data || !total ? (
        <ReportSection title="Período">
          <ErrorState onRetry={() => void refetch()} />
        </ReportSection>
      ) : (
        <>
          <ReportSection
            title="Período"
            caption="Todas las sucursales juntas."
            refreshing={isPlaceholderData}
          >
            <div className="report-tiles">
              <StatTile
                emphasis
                label="Total vendido"
                value={fmtMoney(total.sales.total)}
                hint={`${fmtInt(total.sales.paidOrders)} cobradas`}
              />
              <StatTile
                label="Tableros procesados"
                value={fmtNumber(total.production.boards, 1, 0)}
                hint="Medio tablero = 0,5"
              />
              <StatTile label="Metros de corte" value={fmtMeters(total.production.cutLinearM, 0)} />
              <StatTile
                label="Metros de canteo"
                value={fmtMeters(total.production.bandedLinearM, 0)}
                hint="Sin desperdicio"
              />
              <StatTile
                label="Horas producidas"
                value={`${fmtDecimal(total.production.effectiveHours)} h`}
                hint="De corte, sin paradas"
              />
              <StatTile label="Órdenes terminadas" value={fmtInt(total.orders.finished)} />
            </div>
          </ReportSection>

          <ReportSection
            title="Comparativo"
            caption={
              <>
                Ventas por fecha de cobro (efectivo incluye transferencia). Producción por el corte
                marcado: más de {data.idleMinutes} min sin marcar es una parada.
              </>
            }
            refreshing={isPlaceholderData}
          >
            <BranchComparisonTable
              branches={data.branches}
              total={total}
              groups={SUMMARY_GROUPS}
              caption="Ventas, órdenes y producción por sucursal"
            />
          </ReportSection>
        </>
      )}
    </div>
  )
}

export default SummaryPage
