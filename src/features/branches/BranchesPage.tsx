import { useState } from 'react'
import {
  CButton,
  CFormSwitch,
  CModalHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import BranchForm from './BranchForm'
import { useBranches, useCreateBranch, useUpdateBranch } from './useBranches'
import BranchesFilters, {
  activeCount,
  branchFilterParams,
  branchesFilterChips,
  type BranchesFilterValues,
} from './BranchesFilters'
import type { Branch, BranchPayload, BranchUpdatePayload } from './types'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import ListCard from 'src/shared/components/ListCard'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import type { ListSort } from 'src/shared/components/FilterSortSection'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = ['q', 'isActive']

interface ModalState {
  visible: boolean
  branch: Branch | null
}

// What the branch's shop sends to its print agent, at a glance. Each printer is on or off, told by
// the icon and the tone and read out in words, not by a green or grey badge alone. Off means the
// automatic dispatch is skipped (edit the branch to change it).
const PrinterPill = ({ on, label, title }: { on: boolean; label: string; title: string }) => (
  <span className={`badge status-pill status-pill--${on ? 'success' : 'neutral'}`} title={title}>
    <Icon name={on ? 'check' : 'minus'} className="status-pill__icon" />
    {label}
    <span className="visually-hidden">: {on ? 'sí' : 'no'}</span>
  </span>
)

const PrintingBadges = ({ branch }: { branch: Branch }) => (
  <span className="d-inline-flex gap-1">
    <PrinterPill
      on={branch.printLabelsEnabled}
      label="Etiquetas"
      title="Etiqueta por pieza cortada"
    />
    <PrinterPill
      on={branch.printConsolidatedEnabled}
      label="Hojas"
      title="Hoja consolidada al completar la orden"
    />
  </span>
)

const BranchesPage = () => {
  const { getParam, setParam, setParams, clearParams, offset, setOffset, limit, setLimit } =
    useListParams()

  const search = getParam('q')
  const values: BranchesFilterValues = {
    isActive: getParam('isActive'),
    sort: (getParam('sort') || 'name') as ListSort,
  }

  const handleChange = <K extends keyof BranchesFilterValues>(
    key: K,
    value: BranchesFilterValues[K],
  ) => {
    setParam(key, value)
  }
  // The phone's sheet applies its draft in one url write, which also closes it.
  const handleApply = (next: BranchesFilterValues) =>
    setParams(
      {
        ...next,
        sort: next.sort === 'name' ? undefined : next.sort,
        [FILTER_SHEET_PARAM]: undefined,
      },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const chips = branchesFilterChips(values, handleChange)
  const isFiltered = activeCount(values) > 0 || search !== ''

  const [formModal, setFormModal] = useState<ModalState>({ visible: false, branch: null })

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const { data, isLoading, isError, refetch } = useBranches({
    ...branchFilterParams(values, search),
    sort: values.sort,
    offset,
    limit,
  })
  const branches = data?.items ?? []
  const pagination = data?.pagination
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()

  const openCreate = () => setFormModal({ visible: true, branch: null })
  const openEdit = (branch: Branch) => setFormModal({ visible: true, branch })
  const closeForm = () => {
    setFormModal({ visible: false, branch: null })
    createMutation.reset()
    updateMutation.reset()
  }

  const handleSubmit = (payload: BranchPayload | BranchUpdatePayload) => {
    const { branch } = formModal
    if (branch) {
      updateMutation.mutate({ id: branch.id, data: payload }, { onSuccess: closeForm })
    } else {
      createMutation.mutate(payload as BranchPayload, { onSuccess: closeForm })
    }
  }

  // Soft-delete: the "Activa" toggle maps to isActive via PUT — DELETE is avoided to preserve FK integrity.
  const toggleActive = (branch: Branch) =>
    updateMutation.mutate({ id: branch.id, data: { isActive: !branch.isActive } })

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error

  // Two different dead ends: an empty catalog is a fact, an over-narrow filter is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ninguna sucursal coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Aún no hay sucursales." />
  )

  // The row opens the editor; this switch retires the branch instead, so its click must stop here.
  // It is the only delete this listing has — DELETE is avoided to preserve FK integrity.
  const activeSwitch = (b: Branch) => (
    <CFormSwitch
      checked={b.isActive}
      disabled={updateMutation.isPending}
      onChange={() => toggleActive(b)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Sucursal ${b.name} activa`}
    />
  )

  return (
    <>
      <div className="surface">
        <ListToolbar>
          <SearchInput
            value={search}
            // `replace`: one history entry per settled keystroke would bury the page behind the list.
            onChange={(value) => setParam('q', value, { replace: true })}
            placeholder="Buscar por código o nombre…"
          />
          <BranchesFilters
            values={values}
            search={search}
            onChange={handleChange}
            onApply={handleApply}
            onClear={handleClear}
          />
          <CButton color="primary" className="ms-auto" onClick={openCreate}>
            <Icon name="add" className="me-1" />
            Nueva sucursal
          </CButton>
        </ListToolbar>

        <FilterChips chips={chips} onClearAll={handleClear} />

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one. */}
          <div className="d-md-none">
            {branches.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {branches.map((b) => (
                  <ListCard
                    key={b.id}
                    onClick={() => openEdit(b)}
                    title={b.name}
                    meta={
                      <>
                        <span>{b.code}</span>
                        {b.phone && <span>{b.phone}</span>}
                      </>
                    }
                    action={activeSwitch(b)}
                  >
                    {/* A line of its own: in the dotted facts a long address wrapped with the dot
                        leading the next line. */}
                    {b.address && <div className="small text-body-secondary">{b.address}</div>}
                    <div className="mt-1">
                      <PrintingBadges branch={b} />
                    </div>
                  </ListCard>
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            <CTable align="middle" hover responsive className="list-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Código</CTableHeaderCell>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Dirección</CTableHeaderCell>
                  <CTableHeaderCell>Teléfono</CTableHeaderCell>
                  <CTableHeaderCell>Impresión</CTableHeaderCell>
                  <CTableHeaderCell>Activa</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {branches.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  branches.map((b) => (
                    <CTableRow key={b.id} onClick={() => openEdit(b)}>
                      <CTableDataCell className="fw-semibold">{b.code}</CTableDataCell>
                      <CTableDataCell>{b.name}</CTableDataCell>
                      <CTableDataCell>{b.address ?? '—'}</CTableDataCell>
                      <CTableDataCell>{b.phone ?? '—'}</CTableDataCell>
                      <CTableDataCell className="text-nowrap">
                        <PrintingBadges branch={b} />
                      </CTableDataCell>
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        {activeSwitch(b)}
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
          total={pagination?.total}
          onChange={setOffset}
          onLimitChange={setLimit}
        />
      </div>

      <Modal visible={formModal.visible} onClose={closeForm} backdrop="static" fullscreen="md">
        <CModalHeader>
          <ModalTitle>{formModal.branch ? 'Editar sucursal' : 'Nueva sucursal'}</ModalTitle>
        </CModalHeader>
        <BranchForm
          key={formModal.branch?.id ?? 'new'}
          branch={formModal.branch}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </Modal>
    </>
  )
}

export default BranchesPage
