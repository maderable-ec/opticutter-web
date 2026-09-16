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
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'

import NoBranchNotice, { isNoBranchError } from 'src/shared/components/NoBranchNotice'
import ReferenceNote from 'src/shared/components/ReferenceNote'
import SearchInput from 'src/shared/components/SearchInput'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { clientName, fmtDate } from 'src/shared/utils/format'

import PreOrderStatusBadge from './PreOrderStatusBadge'
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

const PreOrdersPage = () => {
  const navigate = useNavigate()
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
        <PreOrdersFilters
          values={values}
          search={search}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
          showBranch={isGlobalBranch}
        />
        <CButton color="primary" className="ms-auto" onClick={() => void navigate('/optimizer')}>
          <CIcon icon={cilPlus} className="me-1" />
          Nueva cotización
        </CButton>
      </div>

      <FilterChips chips={chips} onClearAll={handleClear} />

      {noBranch ? (
        <NoBranchNotice />
      ) : (
        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          <CTable align="middle" hover responsive className="list-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Código</CTableHeaderCell>
                <CTableHeaderCell>Cliente</CTableHeaderCell>
                <CTableHeaderCell>Sucursal</CTableHeaderCell>
                <CTableHeaderCell>Estado</CTableHeaderCell>
                <CTableHeaderCell>Fuente</CTableHeaderCell>
                <CTableHeaderCell>Creada</CTableHeaderCell>
                <CTableHeaderCell>Vence</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.length === 0 ? (
                <CTableRow>
                  {/* Two different dead ends: an empty catalog is a fact, an over-narrow filter is
                      a place the user needs a way out of. */}
                  <CTableDataCell colSpan={7} className="text-center text-body-secondary py-5">
                    {isFiltered ? (
                      <>
                        <div>Ninguna cotización coincide con los filtros.</div>
                        <CButton color="link" size="sm" onClick={handleClear}>
                          Limpiar filtros
                        </CButton>
                      </>
                    ) : (
                      'Aún no hay cotizaciones.'
                    )}
                  </CTableDataCell>
                </CTableRow>
              ) : (
                items.map((po) => {
                  const expiringSoon = isExpiringSoon(po.expiresAt, po.status)
                  return (
                    <CTableRow key={po.id} onClick={() => void navigate(`/preorders/${po.id}`)}>
                      <CTableDataCell>
                        <strong>{po.code}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        {/* Same move as the orders listing, for the same reason: the reference
                            is what tells two quotes of one client apart, so it reads under the
                            client instead of under the code. */}
                        <div>{clientName(po.client)}</div>
                        <ReferenceNote notes={po.notes} />
                      </CTableDataCell>
                      <CTableDataCell>{po.branch.name}</CTableDataCell>
                      <CTableDataCell>
                        <PreOrderStatusBadge status={po.status} />
                      </CTableDataCell>
                      <CTableDataCell>{po.source}</CTableDataCell>
                      <CTableDataCell className="text-nowrap">
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

export default PreOrdersPage
