import { useId, useMemo, useState } from 'react'
import Icon from 'src/shared/icons/Icon'
import {
  CFormInput,
  CFormLabel,
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
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import RoleBadge from './components/RoleBadge'
import { fmtLocalTime, localHHMM } from './format'
import type { AttendanceDay } from './types'
import { useAttendance } from './useAnalytics'
import { useReportFilters } from './useReportFilters'

const fmtColDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })

const plural = (n: number, one: string, other: string) => `${n} ${n === 1 ? one : other}`

interface EntryProps {
  day: AttendanceDay
  late: boolean
}

// One day's first login. Late is said three ways — the wine ink, a clock, and the word for a screen
// reader — where it used to be red text alone.
const Entry = ({ day, late }: EntryProps) => (
  <span className={`attendance-entry${late ? ' is-late' : ''}`}>
    {late && <Icon name="late" className="attendance-entry__icon" />}
    {fmtLocalTime(day.firstLoginAt)}
    {late && <span className="visually-hidden"> (tarde)</span>}
    {day.loginCount > 1 && (
      <span className="attendance-entry__count">
        ×{day.loginCount}
        <span className="visually-hidden"> inicios de sesión</span>
      </span>
    )}
  </span>
)

// Who came in, and when: the first login of each day, the one clock-in the app records.
const AttendancePage = () => {
  const filters = useReportFilters()
  const { from, to, branchId, role } = filters
  const thresholdId = useId()
  const [lateThreshold, setLateThreshold] = useState('08:00')

  const { data, isLoading, isError, isPlaceholderData, refetch } = useAttendance(
    from,
    to,
    branchId,
    role,
  )

  // Columns = the sorted union of the days anybody logged in. Per user, day → record, and the days
  // they came in late, counted once for the card and the table.
  const { dates, rows } = useMemo(() => {
    const dateSet = new Set<string>()
    const rows = (data?.users ?? []).map((user) => {
      const byDate = new Map<string, AttendanceDay>()
      user.days.forEach((d) => {
        dateSet.add(d.date)
        byDate.set(d.date, d)
      })
      return { user, byDate }
    })
    return { dates: [...dateSet].sort(), rows }
  }, [data])

  const isLate = (day: AttendanceDay) => localHHMM(day.firstLoginAt) > lateThreshold

  return (
    <div className="report">
      <ReportFilters filters={filters} role />

      <ReportSection
        title="Hora de entrada"
        caption="El primer inicio de sesión de cada día. No hay marca de salida."
        refreshing={isPlaceholderData}
        control={
          <div className="report-filters__field attendance-threshold">
            <CFormLabel htmlFor={thresholdId}>Tarde después de</CFormLabel>
            <CFormInput
              id={thresholdId}
              type="time"
              value={lateThreshold}
              onChange={(e) => setLateThreshold(e.target.value)}
            />
          </div>
        }
      >
        {isLoading ? (
          <LoadingBlock rows={5} label="Cargando asistencia…" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Nadie inició sesión en el período" />
        ) : (
          <>
            {/* A phone: one card per person, the late days first — the reason anybody opens this —
                and every day behind «Ver los N días». The matrix of thirty day-columns only ever
                showed a phone its first two. */}
            <div className="d-md-none list-cards">
              {rows.map(({ user }) => {
                const late = user.days.filter(isLate)
                return (
                  <ListCard
                    key={user.userId}
                    title={user.fullName}
                    badges={<RoleBadge roles={user.roles} />}
                    amount={
                      <span className={late.length > 0 ? 'attendance-late-count' : 'fw-normal'}>
                        {plural(late.length, 'tarde', 'tardes')}
                      </span>
                    }
                  >
                    <div className="list-card__meta">
                      <span>{plural(user.days.length, 'día con entrada', 'días con entrada')}</span>
                    </div>
                    {late.length > 0 && (
                      <ul className="attendance-days" aria-label="Días que llegó tarde">
                        {late.map((d) => (
                          <li key={d.date}>
                            <span className="attendance-days__date">{fmtColDate(d.date)}</span>
                            <Entry day={d} late />
                          </li>
                        ))}
                      </ul>
                    )}
                    <details className="attendance-all">
                      <summary>
                        {user.days.length === 1 ? 'Ver el día' : `Ver los ${user.days.length} días`}
                      </summary>
                      <ul className="attendance-days">
                        {user.days.map((d) => (
                          <li key={d.date}>
                            <span className="attendance-days__date">{fmtColDate(d.date)}</span>
                            <Entry day={d} late={isLate(d)} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  </ListCard>
                )
              })}
            </div>

            {/* From `md`: the matrix, with the name pinned while the days scroll under it, and the
                two totals beside the name so they are read before any scrolling. */}
            <div className="d-none d-md-block">
              {/* The scroller is a named, focusable region: a keyboard has to be able to reach the
                  days past the edge, and nothing inside it takes focus on its own. */}
              <div
                className="table-responsive"
                role="region"
                aria-label="Entradas por día"
                tabIndex={0}
              >
                <CTable
                  align="middle"
                  small
                  className="list-table rows-static text-nowrap attendance-table"
                >
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col" className="attendance-table__name">
                        Usuario
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Días
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Tardes
                      </CTableHeaderCell>
                      {dates.map((d) => (
                        <CTableHeaderCell key={d} scope="col" className="text-center">
                          {fmtColDate(d)}
                        </CTableHeaderCell>
                      ))}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.map(({ user, byDate }) => {
                      const lateCount = user.days.filter(isLate).length
                      return (
                        <CTableRow key={user.userId}>
                          <CTableHeaderCell scope="row" className="attendance-table__name">
                            <div className="fw-semibold">{user.fullName}</div>
                            <RoleBadge roles={user.roles} />
                          </CTableHeaderCell>
                          <CTableDataCell className="text-end">{user.days.length}</CTableDataCell>
                          <CTableDataCell
                            className={`text-end${lateCount > 0 ? ' attendance-late-count' : ''}`}
                          >
                            {lateCount}
                          </CTableDataCell>
                          {dates.map((d) => {
                            const day = byDate.get(d)
                            return (
                              <CTableDataCell key={d} className="text-center">
                                {day ? (
                                  <Entry day={day} late={isLate(day)} />
                                ) : (
                                  <span className="text-body-secondary">
                                    —<span className="visually-hidden"> sin entrada</span>
                                  </span>
                                )}
                              </CTableDataCell>
                            )
                          })}
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          </>
        )}
      </ReportSection>
    </div>
  )
}

export default AttendancePage
