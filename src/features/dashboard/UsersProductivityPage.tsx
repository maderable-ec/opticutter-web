import { useId, useMemo, useState, type ReactNode } from 'react'
import Icon from 'src/shared/icons/Icon'
import {
  CFormLabel,
  CFormSelect,
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
import { fmtM2, fmtMoney } from 'src/shared/utils/format'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import RoleBadge from './components/RoleBadge'
import type { UserProductivity } from './types'
import { useUsersProductivity } from './useAnalytics'
import { useReportFilters } from './useReportFilters'
import { fmtDecimal, fmtInt, fmtRate } from './format'

type MetricKey = Exclude<keyof UserProductivity, 'userId' | 'fullName' | 'roles' | 'branchName'>
type SortKey = 'fullName' | MetricKey
type Group = 'corte' | 'canteado' | 'comercial'

interface MetricCol {
  key: MetricKey
  label: string
  // The column header, where the label's unit has to keep its case under the small caps (`.unit`):
  // «ÁREA m²», not «ÁREA M²».
  head?: ReactNode
  // The same figure in a phone's line: «120 piezas».
  unit: (n: number) => string
  group: Group
  fmt: (n: number) => string
  highlight?: boolean
}

const fmtH = (n: number) => `${fmtDecimal(n)} h`
const count = (one: string, other: string) => (n: number) => `${fmtInt(n)} ${n === 1 ? one : other}`

const METRIC_COLS: MetricCol[] = [
  {
    key: 'piecesCut',
    label: 'Piezas',
    group: 'corte',
    fmt: fmtInt,
    unit: count('pieza', 'piezas'),
    highlight: true,
  },
  {
    key: 'boardsCut',
    label: 'Tableros',
    group: 'corte',
    fmt: fmtInt,
    unit: count('tablero', 'tableros'),
    highlight: true,
  },
  {
    key: 'areaCutM2',
    label: 'Área m²',
    head: (
      <>
        Área <span className="unit">m²</span>
      </>
    ),
    group: 'corte',
    fmt: fmtDecimal,
    unit: (n) => fmtM2(n, 1),
    highlight: true,
  },
  {
    key: 'ordersCut',
    label: 'Órdenes',
    group: 'corte',
    fmt: fmtInt,
    unit: count('orden', 'órdenes'),
  },
  { key: 'cuttingHours', label: 'Horas', group: 'corte', fmt: fmtH, unit: fmtH },
  {
    key: 'piecesPerHour',
    label: 'Pz/h',
    head: (
      <>
        Pz/<span className="unit">h</span>
      </>
    ),
    group: 'corte',
    fmt: fmtRate,
    unit: (n) => `${fmtRate(n)} pz/h`,
    highlight: true,
  },
  {
    key: 'ordersBanded',
    label: 'Órdenes',
    group: 'canteado',
    fmt: fmtInt,
    unit: count('orden', 'órdenes'),
  },
  { key: 'bandingHours', label: 'Horas', group: 'canteado', fmt: fmtH, unit: fmtH },
  {
    key: 'ordersCreated',
    label: 'Órdenes',
    group: 'comercial',
    fmt: fmtInt,
    unit: count('orden', 'órdenes'),
    highlight: true,
  },
  {
    key: 'revenueGenerated',
    label: 'Ingresos',
    group: 'comercial',
    fmt: fmtMoney,
    unit: fmtMoney,
    highlight: true,
  },
]

const GROUPS: { id: Group; label: string }[] = [
  { id: 'corte', label: 'Corte' },
  { id: 'canteado', label: 'Canteado' },
  { id: 'comercial', label: 'Comercial' },
]

// The phone's «Ordenar por»: the figures somebody ranks people by, not all ten.
const PHONE_SORTS: { key: SortKey | ''; label: string }[] = [
  { key: '', label: 'Más actividad' },
  { key: 'fullName', label: 'Nombre' },
  { key: 'piecesCut', label: 'Piezas cortadas' },
  { key: 'boardsCut', label: 'Tableros cortados' },
  { key: 'piecesPerHour', label: 'Piezas por hora' },
  { key: 'ordersBanded', label: 'Órdenes canteadas' },
  { key: 'ordersCreated', label: 'Órdenes creadas' },
  { key: 'revenueGenerated', label: 'Ingresos' },
]

type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null

// A name reads A→Z first; a figure, most first.
const defaultDir = (key: SortKey) => (key === 'fullName' ? 'asc' : 'desc')

const branchOf = (u: UserProductivity) =>
  u.roles.includes('administrador') ? 'Global' : (u.branchName ?? '—')

interface SortHeaderProps {
  sortKey: SortKey
  sort: Sort
  onSort: (key: SortKey) => void
  className?: string
  rowSpan?: number
  children: ReactNode
}

// A sortable column head: a real button, so a keyboard reaches it, and `aria-sort` on the cell, so
// a screen reader hears which way the table is ordered. The ▲▼ glyphs it replaced were typed into
// the header's text on a `<th role="button">` with no way in from the keyboard.
const SortHeader = ({ sortKey, sort, onSort, className, rowSpan, children }: SortHeaderProps) => {
  const active = sort?.key === sortKey
  return (
    <CTableHeaderCell
      className={className}
      rowSpan={rowSpan}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {children}
        {active && (
          <Icon name={sort.dir === 'asc' ? 'sortAsc' : 'sortDesc'} className="sort-button__icon" />
        )}
      </button>
    </CTableHeaderCell>
  )
}

// What each person did in the period. Pieces cut are counted on the day they were cut; the rest
// (activities finished, orders sold) by the orders created in the period.
const UsersProductivityPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId, role } = filters
  const [sort, setSort] = useState<Sort>(null)
  const sortSelectId = useId()

  const { data, isLoading, isError, isPlaceholderData, refetch } = useUsersProductivity(
    from,
    to,
    branchId,
    role,
  )

  const sorted = useMemo(() => {
    const list = data?.users ?? []
    if (!sort) return list
    return [...list].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''), 'es')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: defaultDir(key) },
    )

  const empty = (
    <EmptyState
      title="Sin actividad en el período"
      hint={role ? 'Prueba con otro rol o con un período más largo.' : undefined}
    />
  )

  return (
    <div className="report">
      <ReportFilters filters={filters} role />

      <ReportSection
        title="Productividad por usuario"
        caption="Las piezas cuentan el día en que se cortaron; lo demás, por las órdenes creadas en el período."
        refreshing={isPlaceholderData}
        control={
          <div className="report-filters__field d-lg-none">
            <CFormLabel htmlFor={sortSelectId}>Ordenar por</CFormLabel>
            <CFormSelect
              id={sortSelectId}
              value={sort?.key ?? ''}
              onChange={(e) => {
                const key = e.target.value as SortKey | ''
                setSort(key ? { key, dir: defaultDir(key) } : null)
              }}
            >
              {PHONE_SORTS.map((s) => (
                <option key={s.key || 'activity'} value={s.key}>
                  {s.label}
                </option>
              ))}
            </CFormSelect>
          </div>
        }
      >
        {isLoading ? (
          <LoadingBlock rows={5} label="Cargando productividad…" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            {/* Below `lg` a card per person: eleven columns scrolled sideways even at 768, and
                what a person did was the part off screen. Only the groups they worked in. */}
            <div className="d-lg-none">
              {sorted.length === 0 ? (
                empty
              ) : (
                <div className="list-cards">
                  {sorted.map((u) => (
                    <ListCard
                      key={u.userId}
                      title={u.fullName}
                      badges={<RoleBadge roles={u.roles} />}
                      meta={<span>{branchOf(u)}</span>}
                    >
                      <div className="productivity-lines">
                        {GROUPS.map((g) => {
                          const cols = METRIC_COLS.filter((c) => c.group === g.id)
                          if (cols.every((c) => u[c.key] === 0)) return null
                          return (
                            <div key={g.id} className="productivity-line">
                              <span className="eyebrow">{g.label}</span>
                              <span className="list-card__meta">
                                {cols.map((c) => (
                                  <span key={c.key}>{c.unit(u[c.key])}</span>
                                ))}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </ListCard>
                  ))}
                </div>
              )}
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
                    <SortHeader sortKey="fullName" sort={sort} onSort={toggleSort} rowSpan={2}>
                      Usuario
                    </SortHeader>
                    {GROUPS.map((g) => (
                      <CTableHeaderCell
                        key={g.id}
                        scope="colgroup"
                        className="text-center"
                        colSpan={METRIC_COLS.filter((c) => c.group === g.id).length}
                      >
                        {g.label}
                      </CTableHeaderCell>
                    ))}
                  </CTableRow>
                  <CTableRow>
                    {METRIC_COLS.map((c) => (
                      <SortHeader
                        key={c.key}
                        sortKey={c.key}
                        sort={sort}
                        onSort={toggleSort}
                        className="text-end"
                      >
                        {c.head ?? c.label}
                      </SortHeader>
                    ))}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {sorted.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={1 + METRIC_COLS.length} className="p-0">
                        {empty}
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    sorted.map((u) => (
                      <CTableRow key={u.userId}>
                        {/* The one cell that wraps: roles and branch under the name, not beside
                            it, kept the table inside an iPad's width. */}
                        <CTableDataCell className="text-wrap">
                          <div className="fw-semibold">{u.fullName}</div>
                          <div className="d-flex flex-wrap align-items-center gap-1 small text-body-secondary">
                            <RoleBadge roles={u.roles} />
                            <span>{branchOf(u)}</span>
                          </div>
                        </CTableDataCell>
                        {METRIC_COLS.map((c) => (
                          <CTableDataCell
                            key={c.key}
                            // A zero is the role not doing that work: quiet, not bold.
                            className={`text-end${u[c.key] === 0 ? ' text-body-secondary' : c.highlight ? ' fw-semibold' : ''}`}
                          >
                            {c.fmt(u[c.key])}
                          </CTableDataCell>
                        ))}
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </div>
          </>
        )}
      </ReportSection>
    </div>
  )
}

export default UsersProductivityPage
