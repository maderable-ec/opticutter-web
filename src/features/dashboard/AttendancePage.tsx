import {
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { fmtLocalTime, localHHMM } from './format'
import { useMemo, useState } from 'react'

import type { AttendanceDay } from './types'
import DateRangeFilter from './components/DateRangeFilter'
import type { Role } from 'src/features/auth/types'
import RoleBadge from './components/RoleBadge'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { useAttendance } from './useAnalytics'
import { formatDate, subDays } from 'src/shared/utils/date'

const fmtColDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })

const ROLE_FILTERS: { value: '' | Role; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'administrador', label: 'Admin' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'operador', label: 'Operador' },
  { value: 'canteador', label: 'Canteador' },
]

const AttendancePage = () => {
  const [from, setFrom] = useState(() => formatDate(subDays(new Date(), 30)))
  const [to, setTo] = useState(() => formatDate(new Date()))
  const [branch, setBranch] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [lateThreshold, setLateThreshold] = useState('07:00')

  const { data: branches = [] } = useActiveBranches()
  const branchId = branch ? Number(branch) : undefined

  const { data, isLoading, error } = useAttendance(from, to, branchId, role || undefined)

  // Columns = sorted union of all dates that have a login. Per user, a map
  // date → record for O(1) cell lookup.
  const { dates, rows } = useMemo(() => {
    const dateSet = new Set<string>()
    const rows = (data?.users ?? []).map((u) => {
      const byDate = new Map<string, AttendanceDay>()
      u.days.forEach((d) => {
        dateSet.add(d.date)
        byDate.set(d.date, d)
      })
      return { user: u, byDate }
    })
    const dates = [...dateSet].sort()
    return { dates, rows }
  }, [data])

  return (
    <>
      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        branches={branches}
        branchId={branch}
        onBranchChange={setBranch}
      />

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong>Asistencia / hora de entrada</strong>
          <CButtonGroup size="sm">
            {ROLE_FILTERS.map((r) => (
              <CButton
                key={r.value || 'all'}
                color={role === r.value ? 'primary' : 'outline-secondary'}
                onClick={() => setRole(r.value)}
              >
                {r.label}
              </CButton>
            ))}
          </CButtonGroup>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-2 align-items-end mb-3">
            <CCol xs="auto">
              <CFormLabel className="small fw-semibold mb-1">Entrada tardía después de</CFormLabel>
              <CFormInput
                type="time"
                value={lateThreshold}
                onChange={(e) => setLateThreshold(e.target.value)}
                style={{ maxWidth: 140 }}
              />
            </CCol>
            <CCol className="small text-body-secondary">
              Referencia: registra el primer login del día (no hay marca de salida). Las entradas
              posteriores al umbral se marcan en rojo.
            </CCol>
          </CRow>

          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : error ? (
            <div className="text-danger small">Error cargando asistencia: {error.message}</div>
          ) : rows.length === 0 ? (
            <div className="text-body-secondary text-center py-5">
              Sin registros de login en el período
            </div>
          ) : (
            <CTable align="middle" small bordered responsive className="text-nowrap">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Usuario</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Rol</CTableHeaderCell>
                  {dates.map((d) => (
                    <CTableHeaderCell key={d} className="bg-body-tertiary text-center">
                      {fmtColDate(d)}
                    </CTableHeaderCell>
                  ))}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map(({ user, byDate }) => (
                  <CTableRow key={user.userId}>
                    <CTableDataCell>{user.fullName}</CTableDataCell>
                    <CTableDataCell>
                      <RoleBadge role={user.role} />
                    </CTableDataCell>
                    {dates.map((d) => {
                      const day = byDate.get(d)
                      if (!day) {
                        return (
                          <CTableDataCell key={d} className="text-center text-body-secondary">
                            —
                          </CTableDataCell>
                        )
                      }
                      const late = localHHMM(day.firstLoginAt) > lateThreshold
                      return (
                        <CTableDataCell key={d} className="text-center">
                          <span className={late ? 'text-danger fw-semibold' : ''}>
                            {fmtLocalTime(day.firstLoginAt)}
                          </span>
                          {day.loginCount > 1 && (
                            <CBadge color="secondary" className="ms-1" shape="rounded-pill">
                              ×{day.loginCount}
                            </CBadge>
                          )}
                        </CTableDataCell>
                      )
                    })}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default AttendancePage
