import { Link } from 'react-router-dom'
import {
  CAlert,
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
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { useListParams } from 'src/shared/hooks/useListParams'
import { useLowStock } from './useAnalytics'
import LowStockFilters, {
  activeCount,
  lowStockFilterChips,
  type LowStockFilterValues,
} from './LowStockFilters'
import type { LowStockItem } from './types'

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
  board: { color: 'info', label: 'Tablero' },
  edge_banding: { color: 'warning', label: 'Tapacanto' },
}

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = ['q', 'branch', 'type', 'subtype']

// Sheets are whole units, metres are not: "12 m" when the warehouse says 12.5 is as
// wrong as "3.0 láminas".
const amount = (value: number, unit: LowStockItem['unit']) =>
  unit === 'sheets'
    ? `${Number.isInteger(value) ? value : value.toFixed(1)} ${value === 1 ? 'lámina' : 'láminas'}`
    : `${value.toFixed(1)} m`

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

  const search = getParam('q').trim().toLowerCase()
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
  const handleClear = () => clearParams(FILTER_KEYS)

  const chips = lowStockFilterChips(values, branches, handleChange)
  const isFiltered = activeCount(values) > 0 || search !== ''

  const all = data?.items ?? []
  // Code and name, the two things printed on a row — the same pair the catalog's
  // search box matches on, so the habit carries over from one screen to the other.
  const items = all.filter(
    (item) =>
      (values.branch.length === 0 || values.branch.includes(String(item.branch.id))) &&
      (values.type.length === 0 || values.type.includes(item.type)) &&
      (values.subtype.length === 0 ||
        (item.subtype !== null && values.subtype.includes(item.subtype))) &&
      (search === '' ||
        item.code.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search)),
  )
  const page = items.slice(offset, offset + limit)

  return (
    <div className="surface">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <SearchInput
          value={getParam('q')}
          // `replace`: one history entry per settled keystroke would bury the page
          // the user came from behind the list.
          onChange={(value) => setParam('q', value, { replace: true })}
          placeholder="Buscar por código o nombre…"
          className="flex-grow-1"
          style={{ maxWidth: 360 }}
        />
        <LowStockFilters
          values={values}
          branches={branches}
          onChange={handleChange}
          onClear={handleClear}
        />
        {data && (
          <div className="ms-auto small text-body-secondary text-end">
            Mínimos: {data.thresholds.board} láminas · {data.thresholds.edgeBanding} m
            <br />
            <Link to="/settings">Configurar</Link>
          </div>
        )}
      </div>

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
                    {/* Two different dead ends: nothing under the minimum is good
                        news, an over-narrow filter is a place to get out of. */}
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary py-5">
                      {isFiltered ? (
                        <>
                          <div>Ningún producto coincide con los filtros.</div>
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={handleClear}
                          >
                            Limpiar filtros
                          </button>
                        </>
                      ) : (
                        'Ningún producto está por debajo de su mínimo.'
                      )}
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
