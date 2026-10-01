import { Link } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useActiveBranches } from 'src/features/branches/useBranches'
import { prunedSubtypes, subtypeLabel } from 'src/features/products/productSubtypes'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import ListCard from 'src/shared/components/ListCard'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { useLowStock } from './useAnalytics'
import LowStockFilters, {
  activeCount,
  lowStockFilterChips,
  type LowStockFilterValues,
} from './LowStockFilters'
import { filterLowStock } from './lowStock'
import type { LowStockItem } from './types'
import { fmtMeters, fmtNumber } from 'src/shared/utils/format'

// Boards and edge bandings under the threshold configured for their type. The one
// analytics screen with no date range: stock is a state right now, and "low stock
// last March" is a question the vendor's system cannot answer.
//
// **Everything is filtered in the client, and that is a decision.** The endpoint does
// take `branchId`/`type`, but the backend builds the whole branches × products cross
// product either way (the vendor read behind it is cached, not re-queried), so
// filtering server-side would only trim the JSON — at most a few hundred rows. Against
// that, holding the list in memory buys instant multi-select, instant search and zero
// refetches while somebody ticks boxes. The server params stay for other API consumers.

const TYPE_CONFIG: Record<LowStockItem['type'], StatusConfigEntry> = {
  board: { tone: 'info', label: 'Tablero' },
  edge_banding: { tone: 'neutral', label: 'Tapacanto' },
}

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = ['q', 'branch', 'type', 'subtype']

// Sheets are whole units, metres are not: "12 m" when the warehouse says 12.5 is as
// wrong as "3.0 láminas".
const amount = (value: number, unit: LowStockItem['unit']) =>
  unit === 'sheets'
    ? `${fmtNumber(value, 1, 0)} ${value === 1 ? 'lámina' : 'láminas'}`
    : fmtMeters(value, 1)

const LowStockPage = () => {
  const {
    getParam,
    getParams,
    setParam,
    setParams,
    clearParams,
    offset,
    setOffset,
    limit,
    setLimit,
  } = useListParams()

  const { data: branches = [] } = useActiveBranches()
  const { data, isLoading, isError, refetch } = useLowStock()

  const search = getParam('q')
  const values: LowStockFilterValues = {
    branch: getParams('branch'),
    type: getParams('type') as LowStockItem['type'][],
    subtype: getParams('subtype'),
  }

  const handleChange = <K extends keyof LowStockFilterValues>(
    key: K,
    value: LowStockFilterValues[K],
  ) => {
    // Narrowing the type set can strand a subtype that no longer belongs to it,
    // which combines into a guaranteed-empty result nobody asked for. Both keys
    // move in ONE write: two `setParam` calls in a tick do not compose —
    // react-router's updater still sees the pre-update params, so the second wins.
    if (key === 'type') {
      const nextTypes = value as LowStockItem['type'][]
      setParams({ type: nextTypes, subtype: prunedSubtypes(nextTypes, values.subtype) })
      return
    }
    setParam(key, value)
  }
  // The phone's sheet applies its draft in one url write, which also closes it.
  const handleApply = (next: LowStockFilterValues) =>
    setParams(
      {
        ...next,
        subtype: prunedSubtypes(next.type, next.subtype),
        [FILTER_SHEET_PARAM]: undefined,
      },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const chips = lowStockFilterChips(values, branches, handleChange)
  const isFiltered = activeCount(values) > 0 || search.trim() !== ''

  const all = data?.items ?? []
  const items = filterLowStock(all, values, search)
  const page = items.slice(offset, offset + limit)

  // Two different dead ends: nothing under the minimum is good news, an over-narrow filter is a
  // place to get out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ningún producto coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Ningún producto está por debajo de su mínimo." />
  )

  return (
    <div className="surface">
      <ListToolbar>
        <SearchInput
          value={search}
          // `replace`: one history entry per settled keystroke would bury the page
          // the user came from behind the list.
          onChange={(value) => setParam('q', value, { replace: true })}
          placeholder="Buscar por código o nombre…"
        />
        <LowStockFilters
          values={values}
          search={search}
          items={all}
          branches={branches}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
        />
        {data && (
          <div className="ms-auto small text-body-secondary text-end">
            Mínimos: {fmtNumber(data.thresholds.board, 1, 0)} láminas ·{' '}
            {fmtMeters(data.thresholds.edgeBanding, 1, 0)}
            <br />
            <Link to="/settings">Configurar</Link>
          </div>
        )}
      </ListToolbar>

      <FilterChips chips={chips} onClearAll={handleClear} />

      {/* "Nothing is low" and "nobody could tell us" have to read differently, or the
          page lies by omission — so an unanswered report is a banner and not an empty
          table. Above QueryState because it replaces the table entirely. */}
      {data && !data.checked ? (
        <CAlert color="warning" className="py-2 mb-0">
          No se pudo consultar el inventario. Revisa la conexión con el sistema de inventario, o que
          la sucursal tenga configurado su código de bodega.
        </CAlert>
      ) : (
        <>
          <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
            {/* Both views are mounted and the breakpoint picks one. On a phone the table scrolled
                sideways past what is left and the minimum, the two figures the row is about. */}
            <div className="d-md-none">
              {page.length === 0 ? (
                emptyState
              ) : (
                <div className="list-cards">
                  {page.map((item) => (
                    <ListCard
                      key={`${item.branch.id}-${item.productId}`}
                      title={item.code}
                      badges={<StatusBadge value={item.type} config={TYPE_CONFIG} />}
                      amount={
                        <span className={item.available === 0 ? 'text-danger' : undefined}>
                          {amount(item.available, item.unit)}
                        </span>
                      }
                      meta={
                        <>
                          <span>{item.branch.name}</span>
                          <span>Mínimo {amount(item.threshold, item.unit)}</span>
                        </>
                      }
                    >
                      <div className="mt-1">
                        {item.name}
                        {item.subtype && (
                          <span className="text-body-secondary">
                            {' '}
                            · {subtypeLabel(item.subtype)}
                          </span>
                        )}
                      </div>
                    </ListCard>
                  ))}
                </div>
              )}
            </div>

            <div className="d-none d-md-block">
              <CTable align="middle" hover responsive className="list-table rows-static">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Código</CTableHeaderCell>
                    <CTableHeaderCell>Producto</CTableHeaderCell>
                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                    <CTableHeaderCell>Sucursal</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Disponible</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Mínimo</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {page.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="p-0">
                        {emptyState}
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    page.map((item) => (
                      <CTableRow key={`${item.branch.id}-${item.productId}`}>
                        <CTableDataCell className="text-nowrap">
                          <strong>{item.code}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {item.name}
                          {item.subtype && (
                            <div className="text-body-secondary small">
                              {subtypeLabel(item.subtype)}
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <StatusBadge value={item.type} config={TYPE_CONFIG} />
                        </CTableDataCell>
                        <CTableDataCell className="text-nowrap">{item.branch.name}</CTableDataCell>
                        <CTableDataCell className="text-end text-nowrap">
                          {/* Zero is the urgent row, not a missing one. */}
                          <span
                            className={
                              item.available === 0 ? 'text-danger fw-semibold' : 'fw-semibold'
                            }
                          >
                            {amount(item.available, item.unit)}
                          </span>
                        </CTableDataCell>
                        <CTableDataCell className="text-end text-nowrap text-body-secondary">
                          {amount(item.threshold, item.unit)}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </div>
          </QueryState>

          <Pagination
            offset={offset}
            limit={limit}
            total={items.length}
            onChange={setOffset}
            onLimitChange={setLimit}
          />
        </>
      )}
    </div>
  )
}

export default LowStockPage
