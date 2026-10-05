import { useState } from 'react'
import { fmtMoney } from 'src/shared/utils/format'
import EmptyState from 'src/shared/components/EmptyState'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import { useTimeseries } from '../useAnalytics'
import { fmtBucketLabel, fmtInt, fmtMoneyTick } from '../format'
import { GRANULARITIES, GRANULARITY_NOUN } from '../reportFilters'
import type { Granularity, Timeseries } from '../types'
import LineChartFigure from './LineChartFigure'
import ReportSection from './ReportSection'
import Segmented from './Segmented'

type Metric = keyof Timeseries['series']

interface MetricSpec {
  id: Metric
  label: string
  title: string
  format: (n: number) => string
  tick?: (n: number) => string
}

const REVENUE: MetricSpec = {
  id: 'revenue',
  label: 'Ingresos',
  title: 'Ingresos',
  format: fmtMoney,
  tick: fmtMoneyTick,
}

const METRICS: MetricSpec[] = [
  REVENUE,
  { id: 'orderCount', label: 'Órdenes', title: 'Órdenes', format: fmtInt },
  { id: 'boardsConsumed', label: 'Tableros', title: 'Tableros', format: fmtInt },
  { id: 'newClients', label: 'Clientes nuevos', title: 'Clientes nuevos', format: fmtInt },
]

interface TrendsChartProps {
  from: string
  to: string
  granularity: Granularity
  branchId?: number
  className?: string
}

// How the period went, one measure at a time: the four of them on two y-scales told nothing that
// one axis per measure does not tell better.
const TrendsChart = ({ from, to, granularity, branchId, className }: TrendsChartProps) => {
  const [metricId, setMetricId] = useState<Metric>('revenue')
  const { data, isLoading, isError, isPlaceholderData, refetch } = useTimeseries(
    from,
    to,
    granularity,
    branchId,
  )
  const metric = METRICS.find((m) => m.id === metricId) ?? REVENUE
  const noun = GRANULARITY_NOUN[granularity]

  return (
    <ReportSection
      title="Tendencia"
      className={className}
      refreshing={isPlaceholderData}
      control={
        <Segmented label="Medida" items={METRICS} value={metricId} onChange={setMetricId} wrap />
      }
    >
      {isLoading ? (
        <LoadingBlock rows={4} label="Cargando tendencia…" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.buckets.length === 0 ? (
        <EmptyState title="Sin datos en el período" />
      ) : (
        <LineChartFigure
          title={`${metric.title} por ${noun}`}
          periodLabel={GRANULARITIES.find((g) => g.id === granularity)?.label ?? 'Período'}
          labels={data.buckets.map((b) => fmtBucketLabel(b, granularity))}
          values={data.series[metric.id]}
          format={metric.format}
          tick={metric.tick}
          integer={metric.id !== 'revenue'}
        />
      )}
    </ReportSection>
  )
}

export default TrendsChart
