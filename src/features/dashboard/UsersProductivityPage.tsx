import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useMemo, useState } from 'react'

import DateRangeFilter from './components/DateRangeFilter'
import type { Role } from 'src/features/auth/types'
import RoleBadge from './components/RoleBadge'
import type { UserProductivity } from './types'
import { fmtMoney } from 'src/features/review/format'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { useUsersProductivity } from './useAnalytics'

const formatDate = (date: Date) => date.toISOString().slice(0, 10)
const subDays = (date: Date, n: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

const fmtInt = (n: number) => n.toLocaleString('es-EC')
const fmtArea = (n: number) => `${n.toFixed(1)}`
const fmtH1 = (n: number) => `${n.toFixed(1)} h`
const fmtRate = (n: number) => n.toFixed(2)

const ROLE_FILTERS: { value: '' | Role; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'administrador', label: 'Admin' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'operador', label: 'Operador' },
  { value: 'canteador', label: 'Canteador' },
]

type MetricKey = Exclude<keyof UserProductivity, 'userId' | 'fullName' | 'role' | 'branchName'>
type SortKey = 'fullName' | MetricKey

type Group = 'corte' | 'canteado' | 'comercial'

interface MetricCol {
  key: MetricKey
  label: string
  group: Group
  fmt: (n: number) => string
  highlight?: boolean
}

const METRIC_COLS: MetricCol[] = [
  { key: 'piecesCut', label: 'Piezas', group: 'corte', fmt: fmtInt, highlight: true },
  { key: 'boardsCut', label: 'Tableros', group: 'corte', fmt: fmtInt, highlight: true },
  { key: 'areaCutM2', label: 'Área m²', group: 'corte', fmt: fmtArea, highlight: true },
  { key: 'ordersCut', label: 'Órdenes', group: 'corte', fmt: fmtInt },
  { key: 'cuttingHours', label: 'Horas', group: 'corte', fmt: fmtH1 },
  { key: 'piecesPerHour', label: 'Pz/h', group: 'corte', fmt: fmtRate, highlight: true },
  { key: 'ordersBanded', label: 'Órdenes', group: 'canteado', fmt: fmtInt },
  { key: 'bandingHours', label: 'Horas', group: 'canteado', fmt: fmtH1 },
  { key: 'ordersCreated', label: 'Órdenes', group: 'comercial', fmt: fmtInt, highlight: true },
  {
    key: 'revenueGenerated',
    label: 'Ingresos',
    group: 'comercial',
    fmt: fmtMoney,
    highlight: true,
  },
]

const UsersProductivityPage = () => {
  const [from, setFrom] = useState(() => formatDate(subDays(new Date(), 30)))
  const [to, setTo] = useState(() => formatDate(new Date()))
  const [branch, setBranch] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data: branches = [] } = useActiveBranches()
  const branchId = branch ? Number(branch) : undefined

  const { data, isLoading, error } = useUsersProductivity(from, to, branchId, role || undefined)

  const sorted = useMemo(() => {
    const list = data?.users ?? []
    if (!sortKey) return list
    const arr = [...list]
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [data, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'fullName' ? 'asc' : 'desc')
    }
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')
  const sortableProps = (key: SortKey) => ({
    role: 'button' as const,
    onClick: () => toggleSort(key),
  })

  const totalCols = 3 + METRIC_COLS.length

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
          <strong>Productividad por usuario</strong>
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
          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : error ? (
            <div className="text-danger small">Error cargando productividad: {error.message}</div>
          ) : (
            <CTable align="middle" hover responsive className="text-nowrap">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell
                    className="bg-body-tertiary"
                    rowSpan={2}
                    {...sortableProps('fullName')}
                  >
                    Usuario{arrow('fullName')}
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary" rowSpan={2}>
                    Rol
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary" rowSpan={2}>
                    Sucursal
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-center" colSpan={6}>
                    Corte
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-center" colSpan={2}>
                    Canteado
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-center" colSpan={2}>
                    Comercial
                  </CTableHeaderCell>
                </CTableRow>
                <CTableRow>
                  {METRIC_COLS.map((c) => (
                    <CTableHeaderCell
                      key={c.key}
                      className={`bg-body-tertiary text-end${c.highlight ? ' fw-bold' : ''}`}
                      {...sortableProps(c.key)}
                    >
                      {c.label}
                      {arrow(c.key)}
                    </CTableHeaderCell>
                  ))}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sorted.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell
                      colSpan={totalCols}
                      className="text-center text-body-secondary py-5"
                    >
                      Sin datos
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  sorted.map((u) => (
                    <CTableRow key={u.userId}>
                      <CTableDataCell>{u.fullName}</CTableDataCell>
                      <CTableDataCell>
                        <RoleBadge role={u.role} />
                      </CTableDataCell>
                      <CTableDataCell>
                        {u.role === 'administrador' ? 'Global' : (u.branchName ?? '—')}
                      </CTableDataCell>
                      {METRIC_COLS.map((c) => (
                        <CTableDataCell
                          key={c.key}
                          className={`text-end${c.highlight ? ' fw-semibold' : ''}`}
                        >
                          {c.fmt(u[c.key])}
                        </CTableDataCell>
                      ))}
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default UsersProductivityPage
