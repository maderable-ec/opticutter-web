import type { ReactNode } from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { ACTIVITY_LABEL, pauseReasonLabel } from 'src/features/orders/activities'
import EmptyState from 'src/shared/components/EmptyState'
import ListCard from 'src/shared/components/ListCard'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import RecordLink from 'src/shared/components/RecordLink'
import { localDateKey } from 'src/shared/utils/date'
import { fmtM2, fmtMeters, fmtNumber, fmtPercent } from 'src/shared/utils/format'
import BranchComparisonTable from './components/BranchComparisonTable'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import { PRODUCTION_GROUPS } from './comparisonRows'
import { fmtDecimal, fmtHours, fmtInt, fmtLocalTime, fmtRate, fmtWeekday } from './format'
import type { ProductionDay, ProductionPause } from './types'
import { useBranchComparison, useProduction } from './useAnalytics'
import { useReportFilters } from './useReportFilters'

const fmtH = (n: number) => `${fmtDecimal(n)} h`
const fmtBoards = (n: number) => fmtNumber(n, 1, 0)

// The day's span on the clock: «08:12 – 16:05», or a dash when only sheets or closings landed on it.
const span = (day: ProductionDay) =>
  day.firstEventAt ? `${fmtLocalTime(day.firstEventAt)} – ${fmtLocalTime(day.lastEventAt)}` : '—'

// The day has to fit a laptop without scrolling sideways: `head` is a short header for a long label
// (the label stays its accessible name), and a column with `from` only shows from that width — below
// it the phone card and the comparison above still carry the figure.
const FROM_CLASS = {
  xl: ' d-none d-xl-table-cell',
  xxl: ' d-none d-xxl-table-cell',
} as const

const DAY_COLUMNS: {
  label: string
  head?: ReactNode
  from?: keyof typeof FROM_CLASS
  value: (d: ProductionDay) => string
}[] = [
  // The cut's time — what the rates at the end divide by — and, of it, the load. The sawing is
  // the rest, so it and the pauses (which have their own section below) wait for a wide screen:
  // with all four the table ran off a laptop.
  { label: 'Tiempo de corte', head: 'Tiempo', value: (d) => fmtH(d.workHours) },
  { label: 'Carga', value: (d) => fmtH(d.loadingHours) },
  { label: 'Sierra', from: 'xxl', value: (d) => fmtH(d.sawingHours) },
  {
    label: 'En pausa',
    from: 'xxl',
    value: (d) => (d.pausedHours > 0 ? fmtH(d.pausedHours) : '—'),
  },
  { label: 'Tableros', value: (d) => fmtBoards(d.boards) },
  // «Metros»: «Corte» beside «Tiempo de corte» read as the same thing in two units.
  { label: 'Metros de corte', head: 'Metros', value: (d) => fmtMeters(d.cutLinearM, 0) },
  // The tape and, beside it, how many orders it took: «180 m (4)».
  {
    label: 'Canteo',
    value: (d) =>
      d.ordersBanded > 0
        ? `${fmtMeters(d.bandedLinearM, 0)} (${fmtInt(d.ordersBanded)})`
        : fmtMeters(d.bandedLinearM, 0),
  },
  {
    label: 'Adicionales',
    head: <abbr title="Adicionales terminados">Adic.</abbr>,
    from: 'xl',
    value: (d) => fmtInt(d.ordersAdditional),
  },
  { label: 'Terminadas', value: (d) => fmtInt(d.ordersFinished) },
  { label: 'Tabl/h', value: (d) => fmtRate(d.boardsPerHour) },
  { label: 'm/h', value: (d) => fmtDecimal(d.metersPerHour) },
]

// «mié 10 jun · 08:30 – 10:00», «… – jue 11 jun 10:00» across days, «… · sigue en pausa» while open.
const pauseSpan = (p: ProductionPause): string => {
  const startDay = localDateKey(new Date(p.startedAt))
  const start = `${fmtWeekday(startDay)} · ${fmtLocalTime(p.startedAt)}`
  if (!p.endedAt) return `${start} · sigue en pausa`
  const endDay = localDateKey(new Date(p.endedAt))
  const end =
    endDay === startDay
      ? fmtLocalTime(p.endedAt)
      : `${fmtWeekday(endDay)} ${fmtLocalTime(p.endedAt)}`
  return `${start} – ${end}`
}

/**
 * Producción: the workday behind the Resumen's figures. Everything comes off what the shop
 * registers as it cuts: the cut's time runs from taking an order to its last piece — the load up
 * to the first one, the sawing after — and what stops it is a pause the shop registered with its
 * reason. The comparison is every branch; the branch filter narrows the days, the pauses and the
 * material.
 */
const ProductionPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId } = filters
  const comparison = useBranchComparison(from, to)
  const report = useProduction(from, to, branchId)
  const data = report.data

  return (
    <div className="report">
      <ReportFilters filters={filters} />

      <ReportSection
        title="Rendimiento por sucursal"
        caption="El tiempo de corte va de tomar la orden a su última pieza: carga hasta la primera, sierra después. No cuentan las pausas registradas ni lo que cae fuera del horario laboral."
        refreshing={comparison.isPlaceholderData}
      >
        {comparison.isLoading ? (
          <LoadingBlock rows={6} label="Cargando el rendimiento…" />
        ) : comparison.isError || !comparison.data ? (
          <ErrorState onRetry={() => void comparison.refetch()} />
        ) : (
          <BranchComparisonTable
            branches={comparison.data.branches}
            total={comparison.data.total}
            groups={PRODUCTION_GROUPS}
            caption="Producción, jornada y rendimiento por sucursal"
          />
        )}
      </ReportSection>

      {report.isLoading ? (
        <ReportSection title="Jornada por día">
          <LoadingBlock rows={5} label="Cargando la jornada…" />
        </ReportSection>
      ) : report.isError || !data ? (
        <ReportSection title="Jornada por día">
          <ErrorState onRetry={() => void report.refetch()} />
        </ReportSection>
      ) : (
        <>
          <ReportSection
            title="Jornada por día"
            caption="Del primer al último corte marcado del día; la más reciente arriba."
            refreshing={report.isPlaceholderData}
          >
            {data.days.length === 0 ? (
              <EmptyState title="Sin cortes en el período" />
            ) : (
              <>
                <div className="d-lg-none list-cards">
                  {data.days.map((d) => (
                    <ListCard
                      key={`${d.date}-${d.branchId}`}
                      title={`${fmtWeekday(d.date)} · ${d.branchName}`}
                      meta={<span>{span(d)}</span>}
                    >
                      <div className="list-card__meta">
                        <span>{fmtH(d.workHours)} de corte</span>
                        <span>
                          {fmtH(d.loadingHours)} de carga · {fmtH(d.sawingHours)} de sierra
                        </span>
                        {d.pausedHours > 0 && <span>{fmtH(d.pausedHours)} en pausa</span>}
                        <span>{fmtBoards(d.boards)} tableros</span>
                        <span>{fmtMeters(d.cutLinearM, 0)} de corte</span>
                        <span>{fmtMeters(d.bandedLinearM, 0)} de canteo</span>
                        <span>{fmtInt(d.ordersBanded)} canteadas</span>
                        <span>{fmtInt(d.ordersAdditional)} con adicionales</span>
                        <span>{fmtInt(d.ordersFinished)} terminadas</span>
                      </div>
                    </ListCard>
                  ))}
                </div>
                <div className="d-none d-lg-block">
                  <CTable
                    align="middle"
                    hover
                    responsive
                    className="list-table rows-static text-nowrap"
                  >
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell scope="col">Día</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Sucursal</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Jornada</CTableHeaderCell>
                        {DAY_COLUMNS.map((c) => (
                          <CTableHeaderCell
                            key={c.label}
                            scope="col"
                            className={`text-end${c.from ? FROM_CLASS[c.from] : ''}`}
                          >
                            {c.head ?? c.label}
                          </CTableHeaderCell>
                        ))}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {data.days.map((d) => (
                        <CTableRow key={`${d.date}-${d.branchId}`}>
                          <CTableDataCell>{fmtWeekday(d.date)}</CTableDataCell>
                          <CTableDataCell>{d.branchName}</CTableDataCell>
                          <CTableDataCell>{span(d)}</CTableDataCell>
                          {DAY_COLUMNS.map((c) => (
                            <CTableDataCell
                              key={c.label}
                              className={`text-end${c.from ? FROM_CLASS[c.from] : ''}`}
                            >
                              {c.value(d)}
                            </CTableDataCell>
                          ))}
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </>
            )}
          </ReportSection>

          <ReportSection
            title="Pausas"
            caption="Las que registró el taller con su motivo, de cualquier actividad. Las horas son las laborables que duró cada una."
            className="report__half"
            refreshing={report.isPlaceholderData}
          >
            {data.pauses.length === 0 ? (
              <EmptyState title="Sin pausas en el período" />
            ) : (
              <>
                {/* Why the shop stopped, before each time it did: the answer the office acts on
                    (buy boards, buy tape, call the technician) is the total, not the list. */}
                <ul className="pause-totals">
                  {data.pauseTotals.map((t) => (
                    <li key={t.reason} className="pause-totals__item">
                      <span className="fw-semibold">{pauseReasonLabel(t.reason)}</span>
                      <span>
                        {fmtInt(t.count)} {t.count === 1 ? 'pausa' : 'pausas'} · {fmtHours(t.hours)}
                      </span>
                    </li>
                  ))}
                </ul>
                <ol className="production-stops">
                  {data.pauses.map((p) => (
                    <li key={p.id} className="production-stops__row">
                      <span className="production-stops__when">
                        <span className="fw-semibold">
                          {pauseReasonLabel(p.reason)} · {ACTIVITY_LABEL[p.activity]}{' '}
                          <RecordLink to={`/orders/${p.orderId}`}>
                            {p.orderCode ?? `#${p.orderId}`}
                          </RecordLink>
                        </span>
                        <span>
                          {p.branchName} · {pauseSpan(p)}
                          {p.startedBy && ` · ${p.startedBy}`}
                          {p.note && ` · ${p.note}`}
                        </span>
                      </span>
                      <span className="production-stops__length">{fmtHours(p.hours)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </ReportSection>

          <ReportSection
            title="Material"
            caption="De las órdenes terminadas en el período, ponderado por área."
            className="report__half"
            refreshing={report.isPlaceholderData}
          >
            {data.material.length === 0 ? (
              <EmptyState title="Sin órdenes terminadas en el período" />
            ) : (
              <>
                <div className="d-md-none list-cards">
                  {data.material.map((m) => (
                    <ListCard
                      key={m.branchId}
                      title={m.branchName}
                      amount={fmtPercent(m.averageEfficiency)}
                    >
                      <div className="list-card__meta">
                        <span>{fmtM2(m.areaCutM2, 1)} cortados</span>
                        <span>{fmtM2(m.wasteEstimateM2, 1)} de desperdicio</span>
                      </div>
                    </ListCard>
                  ))}
                </div>
                <CTable
                  align="middle"
                  className="d-none d-md-table list-table rows-static text-nowrap mb-0"
                >
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">Sucursal</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Aprovechamiento
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Área
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Desperdicio
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {data.material.map((m) => (
                      <CTableRow key={m.branchId}>
                        <CTableDataCell>{m.branchName}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {fmtPercent(m.averageEfficiency)}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {fmtM2(m.areaCutM2, 1)}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {fmtM2(m.wasteEstimateM2, 1)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </>
            )}
          </ReportSection>
        </>
      )}
    </div>
  )
}

export default ProductionPage
