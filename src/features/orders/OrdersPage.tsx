import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBolt, cilPlus } from '@coreui/icons'

import NoBranchNotice, { isNoBranchError } from 'src/shared/components/NoBranchNotice'
import ReferenceNote from 'src/shared/components/ReferenceNote'
import SearchInput from 'src/shared/components/SearchInput'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { useHasRole, useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { clientName, fmtDate, fmtMoney } from 'src/shared/utils/format'

import OrderStatusBadge from './OrderStatusBadge'
import OrderCard from './OrderCard'
import ActivityBadge from './ActivityBadge'
import ElapsedNote from './ElapsedNote'
import { activityClock, statusClock } from './elapsed'
import OrdersFilters, {
  activeCount,
  orderFilterParams,
  useOrdersFilterChips,
  type OrdersFilterValues,
} from './OrdersFilters'
import { useOrders } from './useOrders'
import { orderedActivities } from './activities'
import type { ActivityStatus, ActivityType, OrderSort, OrderStatus } from './types'

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = [
  'q',
  'status',
  'clientId',
  'branchId',
  'createdFrom',
  'createdTo',
  'isPriority',
  'activity',
  'activityStatus',
]

const OrdersPage = () => {
  const navigate = useNavigate()
  // Operador can view orders but cannot create quotes (that belongs to the optimizer).
  const canCreate = useHasRole('administrador', 'vendedor')
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
  const values: OrdersFilterValues = {
    status: getParams('status') as OrderStatus[],
    clientId: getParam('clientId'),
    branchId: getParam('branchId'),
    createdFrom: getParam('createdFrom'),
    createdTo: getParam('createdTo'),
    // The backend defaults to FIFO for the workshop; this page is the back office's.
    sort: (getParam('sort') || 'recent') as OrderSort,
    isPriority: getParam('isPriority'),
    activity: getParam('activity') as ActivityType | '',
    activityStatus: getParam('activityStatus') as ActivityStatus | '',
  }

  const handleChange = <K extends keyof OrdersFilterValues>(
    key: K,
    value: OrdersFilterValues[K],
  ) => {
    setParam(key, value)
  }
  // The phone's sheet applies its whole draft in one url write, which also closes it: replacing the
  // entry the sheet pushed means back from the new results returns to the previous ones.
  const handleApply = (next: OrdersFilterValues) =>
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

  const chips = useOrdersFilterChips(values, isGlobalBranch, handleChange)
  const filterCount = activeCount(values, isGlobalBranch)
  const isFiltered = filterCount > 0 || search !== ''

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const {
    data: ordersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrders({ ...orderFilterParams(values, search), sort: values.sort, offset, limit })
  const orders = ordersData?.items ?? []
  const pagination = ordersData?.pagination
  const noBranch = isNoBranchError(error)

  // Two different dead ends: an empty catalog is a fact, an over-narrow filter is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <>
      <div>Ninguna orden coincide con los filtros.</div>
      <CButton color="link" size="sm" onClick={handleClear}>
        Limpiar filtros
      </CButton>
    </>
  ) : (
    'Aún no hay órdenes.'
  )

  return (
    <div className="surface">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <SearchInput
          value={search}
          // `replace`: one history entry per settled keystroke would bury the page behind the list.
          onChange={(value) => setParam('q', value, { replace: true })}
          placeholder="Buscar por código, N° o cliente…"
          className="flex-grow-1"
          style={{ maxWidth: 360 }}
        />
        <OrdersFilters
          values={values}
          search={search}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
          showBranch={isGlobalBranch}
        />
        {canCreate && (
          <CButton color="primary" className="ms-auto" onClick={() => void navigate('/optimizer')}>
            <CIcon icon={cilPlus} className="me-1" />
            Nueva cotización
          </CButton>
        )}
      </div>

      <FilterChips chips={chips} onClearAll={handleClear} />

      {noBranch ? (
        <NoBranchNotice />
      ) : (
        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one — the same idiom as the review's
              pieces. Below `md` the seven columns scrolled sideways and hid the total and the
              activities, which are what somebody following up from a phone came for. */}
          <div className="d-md-none">
            {orders.length === 0 ? (
              <div className="text-center text-body-secondary py-5">{emptyState}</div>
            ) : (
              <div className="order-cards">
                {orders.map((o) => (
                  <OrderCard key={o.id} order={o} />
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
                  <CTableHeaderCell>Sucursal</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Actividades</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                  <CTableHeaderCell>Creado</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {orders.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="text-center text-body-secondary py-5">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  orders.map((o) => {
                    const activities = orderedActivities(o.activities)
                    return (
                      <CTableRow key={o.id} onClick={() => void navigate(`/orders/${o.id}`)}>
                        <CTableDataCell>
                          <div className="d-flex align-items-center gap-2">
                            <strong>{o.code ?? '—'}</strong>
                            {/* Orthogonal to the status column: the order jumps the workshop's FIFO. */}
                            {o.isPriority && (
                              <CBadge color="warning" title="Atención prioritaria">
                                <CIcon icon={cilBolt} size="sm" />
                              </CBadge>
                            )}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {/* The reference sits under the CLIENT, not under the code: it is the
                            project or site name, i.e. what tells two orders of the same client
                            apart, so it belongs to the column that names the client rather than
                            competing with the code that titles its own. It replaces the
                            identifier, which is ficha data — and `clientName` already falls back
                            to it for a client with no name. */}
                          <div>{clientName(o.client)}</div>
                          <ReferenceNote notes={o.notes} />
                        </CTableDataCell>
                        {/* Name only: the code said the same thing twice on every row. */}
                        <CTableDataCell>{o.branch.name}</CTableDataCell>
                        <CTableDataCell>
                          <OrderStatusBadge status={o.status} />
                          {/* How long it has been here — the whole point of the column for
                            somebody who has to push the work along. Silent on closed orders. */}
                          <ElapsedNote iso={statusClock(o)} status={o.status} />
                        </CTableDataCell>
                        <CTableDataCell>
                          {/* The three parallel tracks of `in_process`, in process order — the cut
                            included. The Estado column says where the ORDER is, which since
                            `in_process` became an umbrella no longer says who still owes work:
                            "En proceso" reads the same with the cut just started and with it
                            finished waiting on the canteador. Badge and clock share a line, so
                            three activities cost three lines instead of six. The dash is for an
                            order the activity backfill never reached — `_ensure_activities` is
                            lazy and does not run on the listing. */}
                          {activities.length > 0 ? (
                            <div className="d-flex flex-column gap-1">
                              {activities.map((activity) => (
                                <div
                                  key={activity.type}
                                  className="d-flex align-items-center gap-2"
                                >
                                  <ActivityBadge activity={activity} />
                                  <ElapsedNote iso={activityClock(activity)} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-body-secondary">—</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="text-end text-nowrap">
                          {fmtMoney(o.total)}
                        </CTableDataCell>
                        <CTableDataCell className="text-nowrap">
                          {fmtDate(o.createdAt)}
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

export default OrdersPage
