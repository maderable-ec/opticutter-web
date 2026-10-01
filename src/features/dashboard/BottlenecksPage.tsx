import { useId, useState, type ReactNode } from 'react'
import { CFormLabel, CFormSelect } from '@coreui/react'
import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import EmptyState from 'src/shared/components/EmptyState'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import BarList from './components/BarList'
import LineChartFigure from './components/LineChartFigure'
import { useBottlenecks } from './useAnalytics'
import { useReportFilters } from './useReportFilters'
import { fmtBucketLabel, fmtHours, fmtHoursTick, fmtInt } from './format'
import { GRANULARITIES, GRANULARITY_NOUN } from './reportFilters'
import type { BottleneckStageKey } from './types'

// A verdict on a row, not a colour: the slowest stage gets a pill with an icon and the word.
const SLOWEST: Record<string, StatusConfigEntry> = {
  slowest: { tone: 'danger', icon: 'warning', label: 'La más lenta' },
}

const plural = (n: number, one: string, other: string) => `${fmtInt(n)} ${n === 1 ? one : other}`

// How long each stage of an order takes, slowest first (the API sorts by median), and how one
// stage moved over the period.
const BottlenecksPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId, granularity } = filters
  const { data, isLoading, isError, isPlaceholderData, refetch } = useBottlenecks(
    from,
    to,
    branchId,
    granularity,
  )
  const stageSelectId = useId()
  const [picked, setPicked] = useState<BottleneckStageKey | null>(null)

  const stages = data?.stages ?? []
  const measured = stages.filter((s) => s.sampleCount > 0)
  // The evolution opens on the slowest stage — the one the ranking just pointed at.
  const stageKey = picked ?? measured[0]?.key ?? data?.series[0]?.key
  const series = data?.series.find((s) => s.key === stageKey)
  const noun = GRANULARITY_NOUN[granularity]

  const body = (content: ReactNode) =>
    isLoading ? (
      <LoadingBlock rows={5} label="Cargando etapas…" />
    ) : isError ? (
      <ErrorState onRetry={() => void refetch()} />
    ) : measured.length === 0 ? (
      <EmptyState
        title="Sin datos en el período"
        hint="Ninguna orden creada en el período cerró todavía una etapa."
      />
    ) : (
      content
    )

  return (
    <div className="report">
      <ReportFilters filters={filters} granularity />

      {/* The stages as bars rather than a canvas: the p90 and the sample size were only in a hover
          tooltip, which a phone never shows. The median is the bar; the light wash runs on to the
          p90, where 9 in 10 orders had already moved on. */}
      <ReportSection
        title="Cuánto tarda cada etapa"
        caption="Mediana por etapa; la franja clara llega hasta el p90 (9 de cada 10 órdenes)."
        refreshing={isPlaceholderData}
      >
        {body(
          <BarList
            label="Duración por etapa"
            items={stages.map((stage, i) => {
              const empty = stage.sampleCount === 0
              return {
                id: stage.key,
                label: stage.label,
                badge:
                  i === 0 && !empty ? <StatusBadge config={SLOWEST} value="slowest" /> : undefined,
                value: empty ? 0 : stage.medianHours,
                extent: empty ? undefined : stage.p90Hours,
                figure: empty ? (
                  <span className="text-body-secondary">Sin datos</span>
                ) : (
                  <strong>{fmtHours(stage.medianHours)}</strong>
                ),
                detail: empty
                  ? undefined
                  : `p90 ${fmtHours(stage.p90Hours)} · promedio ${fmtHours(stage.avgHours)} · ${plural(stage.sampleCount, 'orden', 'órdenes')}`,
              }
            })}
          />,
        )}
      </ReportSection>

      {/* One stage at a time: seven lines on one plot were a tangle past any legend, worst on a
          phone. The scale then fits the stage being read. */}
      <ReportSection
        title="Evolución"
        caption={`Promedio de la etapa por ${noun}, según el día en que cerró.`}
        refreshing={isPlaceholderData}
        control={
          data && measured.length > 0 ? (
            <div className="report-filters__field">
              <CFormLabel htmlFor={stageSelectId} className="visually-hidden">
                Etapa
              </CFormLabel>
              <CFormSelect
                id={stageSelectId}
                value={stageKey ?? ''}
                onChange={(e) => setPicked(e.target.value as BottleneckStageKey)}
              >
                {data.series.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </CFormSelect>
            </div>
          ) : undefined
        }
      >
        {body(
          series && data ? (
            <LineChartFigure
              title={`${series.label} · horas por ${noun}`}
              periodLabel={GRANULARITIES.find((g) => g.id === granularity)?.label ?? 'Período'}
              labels={data.buckets.map((b) => fmtBucketLabel(b, granularity))}
              values={series.avgHours}
              format={fmtHours}
              tick={fmtHoursTick}
            />
          ) : (
            <EmptyState title="Sin datos en el período" />
          ),
        )}
      </ReportSection>
    </div>
  )
}

export default BottlenecksPage
