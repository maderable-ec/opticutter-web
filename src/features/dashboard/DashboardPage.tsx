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
import { formatDate, subDays } from 'src/shared/utils/date'

const DashboardPage = () => {
  const [from, setFrom] = useState(() => formatDate(subDays(new Date(), 30)))
  const [to, setTo] = useState(() => formatDate(new Date()))
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [branch, setBranch] = useState('')

  // Dashboard is already admin-only, so the branch selector is always shown. '' = all branches.
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
