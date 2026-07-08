import { useState } from 'react'
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { useActiveBranches } from 'src/features/branches/useBranches'
import DateRangeFilter from './components/DateRangeFilter'
import { useBottlenecks } from './useAnalytics'
import { fmtBucketLabel, fmtHours } from './format'
import { formatDate, subDays } from 'src/shared/utils/date'
import type { Granularity } from './types'

// Stable color palette for the 6 stages in the time chart (in process order).
const SERIES_COLORS = [
  () => getStyle('--cui-primary'),
  () => getStyle('--cui-info'),
  () => getStyle('--cui-warning'),
  () => getStyle('--cui-success'),
  () => getStyle('--cui-danger'),
  () => '#8a5cf6',
]

const GRAY = 'rgba(108, 117, 125, 0.4)'

const BottlenecksPage = () => {
  const [from, setFrom] = useState(() => formatDate(subDays(new Date(), 30)))
  const [to, setTo] = useState(() => formatDate(new Date()))
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [branch, setBranch] = useState('')

  const { data: branches = [] } = useActiveBranches()
  const branchId = branch ? Number(branch) : undefined

  const { data, isLoading, error } = useBottlenecks(from, to, branchId, granularity)

  const stages = data?.stages ?? []
  const series = data?.series ?? []
  const buckets = data?.buckets ?? []
  const hasData = stages.some((s) => s.sampleCount > 0)

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

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Cuellos de botella</strong>
          <span className="small text-body-secondary">Mediana por etapa · banda hasta p90</span>
        </CCardHeader>
        <CCardBody>
          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : error ? (
            <div className="text-danger small">
              Error cargando cuellos de botella: {error.message}
            </div>
          ) : !hasData ? (
            <div className="text-body-secondary text-center py-5">Sin datos en el período</div>
          ) : (
            <CChartBar
              style={{ height: `${Math.max(220, stages.length * 46)}px` }}
              data={{
                labels: stages.map((s) =>
                  s.sampleCount === 0 ? `${s.label} (sin datos)` : s.label,
                ),
                datasets: [
                  {
                    label: 'Mediana',
                    data: stages.map((s) => s.medianHours),
                    backgroundColor: stages.map((s, i) =>
                      s.sampleCount === 0
                        ? GRAY
                        : i === 0
                          ? `rgba(${getStyle('--cui-danger-rgb')}, 0.85)` // worst bottleneck
                          : `rgba(${getStyle('--cui-info-rgb')}, 0.75)`,
                    ),
                    borderRadius: 4,
                    barPercentage: 0.7,
                    grouped: false,
                  },
                  {
                    // p90 band: floating bar [median, p90] rendered behind the median bar.
                    label: 'p90',
                    data: stages.map((s): [number, number] => [s.medianHours, s.p90Hours]),
                    backgroundColor: 'rgba(130, 130, 130, 0.25)',
                    barPercentage: 0.7,
                    grouped: false,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top' },
                  tooltip: {
                    // Single tooltip block per stage (prevents duplication when datasets overlap).
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: {
                      label: (ctx) => {
                        const s = stages[ctx.dataIndex]
                        return [
                          `Mediana: ${fmtHours(s.medianHours)}`,
                          `p90: ${fmtHours(s.p90Hours)}`,
                          `Promedio: ${fmtHours(s.avgHours)}`,
                          `n = ${s.sampleCount}`,
                        ]
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: { color: getStyle('--cui-border-color-translucent') },
                    ticks: {
                      color: getStyle('--cui-body-color'),
                      callback: (v) => `${v} h`,
                    },
                  },
                  y: {
                    grid: { display: false },
                    ticks: { color: getStyle('--cui-body-color') },
                  },
                },
              }}
            />
          )}
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="small fw-semibold text-body-secondary">
          Evolución temporal por etapa
        </CCardHeader>
        <CCardBody>
          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : error ? (
            <div className="text-danger small">
              Error cargando la serie temporal: {error.message}
            </div>
          ) : buckets.length === 0 ? (
            <div className="text-body-secondary text-center py-5">Sin datos en el período</div>
          ) : (
            <CChartLine
              style={{ height: '320px' }}
              data={{
                labels: buckets.map((b) => fmtBucketLabel(b, granularity)),
                datasets: series.map((s, i) => {
                  const color = (SERIES_COLORS[i] ?? SERIES_COLORS[0])()
                  return {
                    label: s.label,
                    data: s.avgHours,
                    borderColor: color,
                    backgroundColor: 'transparent',
                    pointHoverBackgroundColor: color,
                    borderWidth: 2,
                    tension: 0.4,
                  }
                }),
              }}
              options={{
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                  legend: { display: true, position: 'top' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: ${fmtHours(ctx.parsed.y ?? 0)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: {
                      color: getStyle('--cui-border-color-translucent'),
                      drawOnChartArea: false,
                    },
                    ticks: { color: getStyle('--cui-body-color') },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: getStyle('--cui-border-color-translucent') },
                    ticks: {
                      color: getStyle('--cui-body-color'),
                      callback: (v) => `${v} h`,
                      maxTicksLimit: 6,
                    },
                  },
                },
              }}
            />
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default BottlenecksPage
