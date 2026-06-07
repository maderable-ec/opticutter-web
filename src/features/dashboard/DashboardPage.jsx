import React, { useState } from 'react'
import { CCol, CRow } from '@coreui/react'
import DateRangeFilter from './components/DateRangeFilter'
import KpiCards from './components/KpiCards'
import TrendsChart from './components/TrendsChart'
import StatusBreakdown from './components/StatusBreakdown'
import OperationsPanel from './components/OperationsPanel'

const formatDate = (date) => date.toISOString().slice(0, 10)
const subDays = (date, n) => {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

const DashboardPage = () => {
  const [from, setFrom] = useState(() => formatDate(subDays(new Date(), 30)))
  const [to, setTo] = useState(() => formatDate(new Date()))
  const [granularity, setGranularity] = useState('day')

  return (
    <>
      <DateRangeFilter
        from={from}
        to={to}
        granularity={granularity}
        onFromChange={setFrom}
        onToChange={setTo}
        onGranularityChange={setGranularity}
      />
      <KpiCards from={from} to={to} />
      <TrendsChart from={from} to={to} granularity={granularity} />
      <CRow>
        <CCol md={6}>
          <StatusBreakdown from={from} to={to} />
        </CCol>
        <CCol md={6}>
          <OperationsPanel from={from} to={to} />
        </CCol>
      </CRow>
    </>
  )
}

export default DashboardPage
