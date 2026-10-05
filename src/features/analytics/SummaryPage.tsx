import ReportFilters from './components/ReportFilters'
import KpiCards from './components/KpiCards'
import TrendsChart from './components/TrendsChart'
import StatusBreakdown from './components/StatusBreakdown'
import BranchBreakdown from './components/BranchBreakdown'
import { useReportFilters } from './useReportFilters'

// Resumen: how the period went, for the admin (the seller's «what now» is Inicio). One filter row
// scopes every block below it; the blocks are `.surface`s on a grid that pairs the short ones from
// `lg`.
const SummaryPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId, granularity } = filters

  return (
    <div className="report">
      <ReportFilters filters={filters} granularity />
      <KpiCards from={from} to={to} branchId={branchId} />
      <TrendsChart from={from} to={to} granularity={granularity} branchId={branchId} />
      <StatusBreakdown from={from} to={to} branchId={branchId} className="report__half" />
      <BranchBreakdown from={from} to={to} branchId={branchId} className="report__half" />
    </div>
  )
}

export default SummaryPage
