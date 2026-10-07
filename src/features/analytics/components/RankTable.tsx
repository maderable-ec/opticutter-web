import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  CFormLabel,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import EmptyState from 'src/shared/components/EmptyState'
import ListCard from 'src/shared/components/ListCard'
import SortHeader, { type Sort } from './SortHeader'

// One figure of a person's row. `value` sorts it; `format` prints it (with the row, for a figure
// that pairs two numbers: «$380 (2)»); `unit` is the same figure in a phone's line («14 tableros»).
export interface RankColumn<T> {
  id: string
  label: string
  head?: ReactNode
  value: (row: T) => number
  format: (value: number, row: T) => string
  unit: (value: number, row: T) => string
  // The figures somebody ranks people by: bold.
  highlight?: boolean
}

interface Person {
  userId: number | null
  fullName: string
  branchName: string | null
}

interface RankTableProps<R extends Person, T> {
  rows: R[]
  total: T
  columns: RankColumn<R | T>[]
  empty: string
  // Opens what is behind a person's figures. A row with no user (the work of users deleted since)
  // has nothing to open and stays a plain reading.
  onRowClick?: (row: R) => void
}

// A column's id, or 'fullName' for the person.
type SortKey = string

// A name reads A→Z first; a figure, most first.
const defaultDir = (key: SortKey) => (key === 'fullName' ? 'asc' : 'desc')

/**
 * The people of one role, ranked: a table with sortable heads and a total row from `lg`, a card per
 * person below it (more than six figures scroll sideways even at 768, and what a person did was the
 * part off screen). The API's order — most work first — until a head is clicked.
 */
const RankTable = <R extends Person, T>({
  rows,
  total,
  columns,
  empty,
  onRowClick,
}: RankTableProps<R, T>) => {
  const [sort, setSort] = useState<Sort<SortKey>>(null)
  const sortSelectId = useId()

  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.id === sort.key)
    return [...rows].sort((a, b) => {
      const cmp = column
        ? column.value(a) - column.value(b)
        : a.fullName.localeCompare(b.fullName, 'es')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, columns, sort])

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: defaultDir(key) },
    )

  const opener = (row: R) => (onRowClick && row.userId != null ? () => onRowClick(row) : undefined)

  if (rows.length === 0) return <EmptyState title={empty} />

  return (
    <>
      <div className="d-lg-none">
        <div className="report-filters__field mb-2">
          <CFormLabel htmlFor={sortSelectId}>Ordenar por</CFormLabel>
          <CFormSelect
            id={sortSelectId}
            value={sort?.key ?? ''}
            onChange={(e) => {
              const key = e.target.value
              setSort(key ? { key, dir: defaultDir(key) } : null)
            }}
          >
            <option value="">Más actividad</option>
            <option value="fullName">Nombre</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </CFormSelect>
        </div>
        <div className="list-cards">
          {sorted.map((row) => (
            <ListCard
              key={row.userId ?? 'none'}
              onClick={opener(row)}
              title={row.fullName}
              meta={<span>{row.branchName ?? 'Global'}</span>}
            >
              <div className="list-card__meta">
                {columns.map((c) => (
                  <span key={c.id}>{c.unit(c.value(row), row)}</span>
                ))}
              </div>
            </ListCard>
          ))}
          <ListCard title="Total">
            <div className="list-card__meta">
              {columns.map((c) => (
                <span key={c.id}>{c.unit(c.value(total), total)}</span>
              ))}
            </div>
          </ListCard>
        </div>
      </div>

      <div className="d-none d-lg-block">
        <CTable
          align="middle"
          hover
          responsive
          className={`list-table text-nowrap${onRowClick ? '' : ' rows-static'}`}
        >
          <CTableHead>
            <CTableRow>
              <SortHeader sortKey="fullName" sort={sort} onSort={toggleSort}>
                Usuario
              </SortHeader>
              {columns.map((c) => (
                <SortHeader
                  key={c.id}
                  sortKey={c.id}
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
            {sorted.map((row) => {
              const open = opener(row)
              return (
                <CTableRow
                  key={row.userId ?? 'none'}
                  onClick={open}
                  className={onRowClick && !open ? 'is-static' : undefined}
                >
                  <CTableDataCell className="text-wrap">
                    {/* The keyboard's stop: a row is none, the name is a button. It stops the click
                    from reaching the row, which would open the same thing twice. */}
                    {open ? (
                      <button
                        type="button"
                        className="record-link rank-table__open"
                        onClick={(e) => {
                          e.stopPropagation()
                          open()
                        }}
                      >
                        {row.fullName}
                      </button>
                    ) : (
                      <div className="fw-semibold">{row.fullName}</div>
                    )}
                    <div className="small text-body-secondary">{row.branchName ?? 'Global'}</div>
                  </CTableDataCell>
                  {columns.map((c) => {
                    const value = c.value(row)
                    return (
                      <CTableDataCell
                        key={c.id}
                        // A zero is work the person did not do: quiet, not bold.
                        className={`text-end${value === 0 ? ' text-body-secondary' : c.highlight ? ' fw-semibold' : ''}`}
                      >
                        {c.format(value, row)}
                      </CTableDataCell>
                    )
                  })}
                </CTableRow>
              )
            })}
          </CTableBody>
          <CTableFoot>
            <CTableRow className="rank-table__total">
              <CTableHeaderCell scope="row">Total</CTableHeaderCell>
              {columns.map((c) => (
                <CTableDataCell key={c.id} className="text-end">
                  {c.format(c.value(total), total)}
                </CTableDataCell>
              ))}
            </CTableRow>
          </CTableFoot>
        </CTable>
      </div>
    </>
  )
}

export default RankTable
