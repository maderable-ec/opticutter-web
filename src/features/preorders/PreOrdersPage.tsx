import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import NoBranchNotice, { isNoBranchError } from 'src/shared/components/NoBranchNotice'
import { MASK } from 'src/shared/analytics'
import ReferenceNote from 'src/shared/components/ReferenceNote'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import RememberedList from 'src/shared/components/RememberedList'
import RecordLink from 'src/shared/components/RecordLink'
import { useListParams } from 'src/shared/hooks/useListParams'
import { useFromHere } from 'src/shared/hooks/useShellNav'
import { useStartQuote } from 'src/features/optimizer/useStartQuote'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { clientName, fmtDate } from 'src/shared/utils/format'

import PreOrderStatusBadge from './PreOrderStatusBadge'
import PreOrderCard from './PreOrderCard'
import PreOrdersFilters, {
  activeCount,
  preorderFilterParams,
  usePreOrdersFilterChips,
  type PreOrdersFilterValues,
} from './PreOrdersFilters'
import { usePreOrders } from './usePreOrders'
import { isExpiringSoon } from './status'
import type { PreOrderSort, PreOrderStatus } from './types'

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = ['q', 'status', 'clientId', 'branchId', 'createdFrom', 'createdTo']

const PreOrdersList = () => {
  const navigate = useNavigate()
  const { startQuote, dialog: startQuoteDialog } = useStartQuote()
  // The rows open their record with this list as its origin, as the code's `RecordLink` does.
  const fromHere = useFromHere()
  const isGlobalBranch = useIsGlobalBranchRole()
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

  const search = getParam('q')
  const values: PreOrdersFilterValues = {
    status: getParams('status') as PreOrderStatus[],
    clientId: getParam('clientId'),
    branchId: getParam('branchId'),
    createdFrom: getParam('createdFrom'),
    createdTo: getParam('createdTo'),
    sort: (getParam('sort') || 'recent') as PreOrderSort,
  }

  const handleChange = <K extends keyof PreOrdersFilterValues>(
    key: K,
    value: PreOrdersFilterValues[K],
  ) => {
    setParam(key, value)
  }
  // The phone's sheet applies its whole draft in one url write, which also closes it (see
  // `useFilterSheet` for the history this leaves).
  const handleApply = (next: PreOrdersFilterValues) =>
    setParams(
      {
        ...next,
        // The default order stays out of the URL, as it does when nobody touches the select.
        sort: next.sort === 'recent' ? undefined : next.sort,
        [FILTER_SHEET_PARAM]: undefined,
      },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const chips = usePreOrdersFilterChips(values, isGlobalBranch, handleChange)
  const isFiltered = activeCount(values, isGlobalBranch) > 0 || search !== ''

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const { data, isLoading, isError, error, refetch } = usePreOrders({
    ...preorderFilterParams(values, search),
    sort: values.sort,
    offset,
    limit,
  })
  const items = data?.items ?? []
  const pagination = data?.pagination
  const noBranch = isNoBranchError(error)

  // Two different dead ends: an empty catalog is a fact, an over-narrow filter is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ninguna cotización coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Aún no hay cotizaciones." />
  )

  return (
    <div className="surface">
      <ListToolbar>
        <SearchInput
          value={search}
          // `replace`: one history entry per settled keystroke would bury the page behind the list.
          onChange={(value) => setParam('q', value, { replace: true })}
          placeholder="Buscar por código, N° o cliente…"
        />
        <PreOrdersFilters
          values={values}
          search={search}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
          showBranch={isGlobalBranch}
        />
        {/* From `md` up: on a phone the bottom nav's «Cotizar» is the same button, one thumb away. */}
        <CButton color="primary" className="ms-auto d-none d-md-inline-block" onClick={startQuote}>
          <Icon name="add" className="me-1" />
          Nueva cotización
        </CButton>
      </ListToolbar>
      {startQuoteDialog}

      <FilterChips chips={chips} onClearAll={handleClear} />

      {noBranch ? (
        <NoBranchNotice />
      ) : (
        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one, as on /orders. */}
          <div className="d-md-none">
            {items.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {items.map((po) => (
                  <PreOrderCard key={po.id} preorder={po} />
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            <CTable align="middle" hover responsive className="list-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Código</CTableHeaderCell>
                  <CTableHeaderCell>Cliente</CTableHeaderCell>
                  {/* On a portrait tablet the seven columns scrolled sideways and pushed the due date — what a
    quote is followed up by — out of view. The branch and the creation date wait for `lg`, the
    source, the least read of all, for `xl`. */}
                  <CTableHeaderCell className="d-none d-lg-table-cell">Sucursal</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell className="d-none d-xl-table-cell">Fuente</CTableHeaderCell>
                  <CTableHeaderCell className="d-none d-lg-table-cell">Creada</CTableHeaderCell>
                  <CTableHeaderCell>Vence</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  items.map((po) => {
                    const expiringSoon = isExpiringSoon(po.expiresAt, po.status)
                    return (
                      <CTableRow
                        key={po.id}
                        onClick={() => void navigate(`/preorders/${po.id}`, { state: fromHere })}
                      >
                        <CTableDataCell className="text-nowrap">
                          <RecordLink to={`/preorders/${po.id}`}>{po.code}</RecordLink>
                        </CTableDataCell>
                        <CTableDataCell>
                          {/* Same move as the orders listing, for the same reason: the reference
                            is what tells two quotes of one client apart, so it reads under the
                            client instead of under the code. */}
                          <div {...MASK}>{clientName(po.client)}</div>
                          <ReferenceNote notes={po.notes} />
                        </CTableDataCell>
                        <CTableDataCell className="d-none d-lg-table-cell">
                          {po.branch.name}
                        </CTableDataCell>
                        <CTableDataCell>
                          <PreOrderStatusBadge status={po.status} />
                        </CTableDataCell>
                        <CTableDataCell className="d-none d-xl-table-cell">
                          {po.source}
                        </CTableDataCell>
                        <CTableDataCell className="d-none d-lg-table-cell text-nowrap">
                          {fmtDate(po.createdAt)}
                        </CTableDataCell>
                        <CTableDataCell
                          className={`text-nowrap ${expiringSoon ? 'text-danger fw-semibold' : ''}`}
                        >
                          {fmtDate(po.expiresAt)}
                          {expiringSoon && ' ⚠'}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })
                )}
              </CTableBody>
            </CTable>
          </div>
        </QueryState>
      )}

      <Pagination
        offset={offset}
        limit={limit}
        total={pagination?.total}
        onChange={setOffset}
        onLimitChange={setLimit}
      />
    </div>
  )
}

// Coming back from a quote by any door (the detail's "Volver", the breadcrumb, the sidebar) lands on
// the list as it was left, not on a bare one: see `RememberedList`.
const PreOrdersPage = () => (
  <RememberedList list="preorders">
    <PreOrdersList />
  </RememberedList>
)

export default PreOrdersPage
