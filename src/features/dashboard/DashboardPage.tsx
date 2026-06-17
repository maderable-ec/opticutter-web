import { useState } from 'react'
import { CCol, CRow } from '@coreui/react'
import { useActiveBranches } from 'src/features/branches/useBranches'
import DateRangeFilter from './components/DateRangeFilter'
import KpiCards from './components/KpiCards'
import TrendsChart from './components/TrendsChart'
import StatusBreakdown from './components/StatusBreakdown'
import BranchBreakdown from './components/BranchBreakdown'
import OperationsPanel from './components/OperationsPanel'
import type { Granularity } from './types'

const formatDate = (date: Date) => date.toISOString().slice(0, 10)
const subDays = (date: Date, n: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

const DashboardPage = () => {
  const [from, setFrom] = useState(() => formatDate(subDays(new Date(), 30)))
  const [to, setTo] = useState(() => formatDate(new Date()))
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [branch, setBranch] = useState('')

  // El dashboard ya es admin-only, así que el selector de sucursal se muestra siempre. '' = todas.
  const { data: branches = [] } = useActiveBranches()
  const branchId = branch ? Number(branch) : undefined

  return (
    <>
      <DateRangeFilter
        from={from}
        to={to}
        granularity={granularity}
        onFromChange={setFrom}
        onToChange={setTo}
        onGranularityChange={setGranularity}
        branches={branches}
        branchId={branch}
        onBranchChange={setBranch}
      />
      <KpiCards from={from} to={to} branchId={branchId} />
      <TrendsChart from={from} to={to} granularity={granularity} branchId={branchId} />
      <CRow>
        <CCol md={6}>
          <StatusBreakdown from={from} to={to} branchId={branchId} />
        </CCol>
        <CCol md={6}>
          <OperationsPanel from={from} to={to} branchId={branchId} />
        </CCol>
      </CRow>
      <BranchBreakdown from={from} to={to} branchId={branchId} />
    </>
  )
}

export default DashboardPage
