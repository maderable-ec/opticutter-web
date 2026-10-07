import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import EmptyState from 'src/shared/components/EmptyState'
import ListCard from 'src/shared/components/ListCard'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import { localDateKey } from 'src/shared/utils/date'
import { fmtM2, fmtMeters, fmtNumber, fmtPercent } from 'src/shared/utils/format'
import BranchComparisonTable from './components/BranchComparisonTable'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import { PRODUCTION_GROUPS } from './comparisonRows'
import { fmtDecimal, fmtHours, fmtInt, fmtLocalTime, fmtRate, fmtWeekday } from './format'
import type { ProductionDay } from './types'
import { useBranchComparison, useProduction } from './useAnalytics'
import { useReportFilters } from './useReportFilters'

const fmtH = (n: number) => `${fmtDecimal(n)} h`
const fmtBoards = (n: number) => fmtNumber(n, 1, 0)

// The day's span on the clock: «08:12 – 16:05», or a dash when only sheets or closings landed on it.
const span = (day: ProductionDay) =>
  day.firstEventAt ? `${fmtLocalTime(day.firstEventAt)} – ${fmtLocalTime(day.lastEventAt)}` : '—'

const DAY_COLUMNS: { label: string; value: (d: ProductionDay) => string }[] = [
  { label: 'Efectivas', value: (d) => fmtH(d.effectiveHours) },
  { label: 'Paradas', value: (d) => fmtH(d.pausedHours) },
  { label: 'Tableros', value: (d) => fmtBoards(d.boards) },
  { label: 'Corte', value: (d) => fmtMeters(d.cutLinearM, 0) },
  { label: 'Canteo', value: (d) => fmtMeters(d.bandedLinearM, 0) },
  { label: 'Terminadas', value: (d) => fmtInt(d.ordersFinished) },
  { label: 'Tabl/h', value: (d) => fmtRate(d.boardsPerHour) },
  { label: 'm/h', value: (d) => fmtDecimal(d.metersPerHour) },
]

/**
 * Producción: the workday behind the Resumen's figures. Everything comes off the pieces the shop
 * marks as it cuts: the start is the first mark (or taking an order), and every gap longer than
 * the idle gap is a stop. The comparison is every branch; the branch filter narrows the days, the
 * stops and the material.
 */
const ProductionPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId } = filters
  const comparison = useBranchComparison(from, to)
  const report = useProduction(from, to, branchId)
  const data = report.data
  const idleMinutes = comparison.data?.idleMinutes ?? data?.idleMinutes

  return (
    <div className="report">
      <ReportFilters filters={filters} />

      <ReportSection
        title="Rendimiento por sucursal"
        caption={`Una parada es más de ${idleMinutes ?? 15} min sin marcar una pieza durante la jornada.`}
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
                        <span>{fmtH(d.effectiveHours)} efectivas</span>
                        <span>{fmtH(d.pausedHours)} paradas</span>
                        <span>{fmtBoards(d.boards)} tableros</span>
                        <span>{fmtMeters(d.cutLinearM, 0)} de corte</span>
                        <span>{fmtMeters(d.bandedLinearM, 0)} de canteo</span>
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
                          <CTableHeaderCell key={c.label} scope="col" className="text-end">
                            {c.label}
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
                            <CTableDataCell key={c.label} className="text-end">
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
            title="Paradas largas"
            caption="Las más largas del período, dentro de la jornada."
            className="report__half"
            refreshing={report.isPlaceholderData}
          >
            {data.stops.length === 0 ? (
              <EmptyState title="Sin paradas en el período" />
            ) : (
              <ol className="production-stops">
                {data.stops.map((s) => (
                  <li key={`${s.branchId}-${s.startedAt}`} className="production-stops__row">
                    <span className="production-stops__when">
                      <span className="fw-semibold">{s.branchName}</span>
                      <span>
                        {fmtWeekday(localDateKey(new Date(s.startedAt)))} ·{' '}
                        {fmtLocalTime(s.startedAt)} – {fmtLocalTime(s.endedAt)}
                      </span>
                    </span>
                    <span className="production-stops__length">{fmtHours(s.minutes / 60)}</span>
                  </li>
                ))}
              </ol>
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
