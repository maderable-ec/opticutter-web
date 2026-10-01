import { useState } from 'react'
import {
  CButton,
  CModalHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import ServiceForm from './ServiceForm'
import { useCreateService, useDeleteService, useServices, useUpdateService } from './useServices'
import ServicesFilters, {
  activeCount,
  serviceFilterParams,
  servicesFilterChips,
  type ServicesFilterValues,
} from './ServicesFilters'
import type { AdditionalService, AdditionalServicePayload } from './types'
import { fmtMoney } from 'src/shared/utils/format'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import ListCard from 'src/shared/components/ListCard'
import ActiveBadge from 'src/shared/components/ActiveBadge'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import type { ListSort } from 'src/shared/components/FilterSortSection'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = ['q', 'isActive']

interface ModalState {
  visible: boolean
  service: AdditionalService | null
}

const ServicesPage = () => {
  const { getParam, setParam, setParams, clearParams, offset, setOffset, limit, setLimit } =
    useListParams()

  const search = getParam('q')
  const values: ServicesFilterValues = {
    isActive: getParam('isActive'),
    sort: (getParam('sort') || 'name') as ListSort,
  }

  const handleChange = <K extends keyof ServicesFilterValues>(
    key: K,
    value: ServicesFilterValues[K],
  ) => {
    setParam(key, value)
  }
  // The phone's sheet applies its draft in one url write, which also closes it.
  const handleApply = (next: ServicesFilterValues) =>
    setParams(
      {
        ...next,
        sort: next.sort === 'name' ? undefined : next.sort,
        [FILTER_SHEET_PARAM]: undefined,
      },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const chips = servicesFilterChips(values, handleChange)
  const isFiltered = activeCount(values) > 0 || search !== ''

  const [formModal, setFormModal] = useState<ModalState>({ visible: false, service: null })
  const [deleteModal, setDeleteModal] = useState<ModalState>({ visible: false, service: null })

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const {
    data: servicesData,
    isLoading,
    isError,
    refetch,
  } = useServices({ ...serviceFilterParams(values, search), sort: values.sort, offset, limit })
  const services = servicesData?.items ?? []
  const pagination = servicesData?.pagination

  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()

  const openCreate = () => setFormModal({ visible: true, service: null })
  const openEdit = (service: AdditionalService) => setFormModal({ visible: true, service })
  const closeForm = () => {
    setFormModal({ visible: false, service: null })
    createMutation.reset()
    updateMutation.reset()
  }
  const openDelete = (service: AdditionalService) => setDeleteModal({ visible: true, service })
  const closeDelete = () => setDeleteModal({ visible: false, service: null })

  const handleSubmit = (data: AdditionalServicePayload) => {
    const { service } = formModal
    if (service) {
      updateMutation.mutate({ id: service.id, data }, { onSuccess: closeForm })
    } else {
      createMutation.mutate(data, { onSuccess: closeForm })
    }
  }

  const handleDelete = () => {
    if (!deleteModal.service) return
    deleteMutation.mutate(deleteModal.service.id, { onSuccess: closeDelete })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error

  // Two different dead ends: an empty catalog is a fact, an over-narrow filter is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ningún servicio coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Aún no hay servicios adicionales." />
  )

  // The row opens the editor, so only the destructive action keeps a button — and it must not also
  // open it on the way. In the last column from `md`, beside the card on a phone.
  const deleteButton = (s: AdditionalService) => (
    <CButton
      variant="ghost"
      color="danger"
      size="sm"
      aria-label={`Eliminar ${s.name}`}
      onClick={(e) => {
        e.stopPropagation()
        openDelete(s)
      }}
    >
      <Icon name="delete" />
    </CButton>
  )

  return (
    <>
      <div className="surface">
        <ListToolbar>
          <SearchInput
            value={search}
            // `replace`: one history entry per settled keystroke would bury the page behind the list.
            onChange={(value) => setParam('q', value, { replace: true })}
            placeholder="Buscar por nombre…"
          />
          <ServicesFilters
            values={values}
            search={search}
            onChange={handleChange}
            onApply={handleApply}
            onClear={handleClear}
          />
          <CButton color="primary" className="ms-auto" onClick={openCreate}>
            <Icon name="add" className="me-1" />
            Nuevo servicio
          </CButton>
        </ListToolbar>

        <FilterChips chips={chips} onClearAll={handleClear} />

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one. */}
          <div className="d-md-none">
            {services.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {services.map((s) => (
                  <ListCard
                    key={s.id}
                    onClick={() => openEdit(s)}
                    title={s.name}
                    // Only the exception: «Activo» on every row says nothing.
                    badges={s.isActive ? undefined : <ActiveBadge active={false} />}
                    amount={fmtMoney(s.price)}
                    meta={<span>Precio con IVA</span>}
                    action={deleteButton(s)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            <CTable align="middle" hover responsive className="list-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>ID</CTableHeaderCell>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Precio (c/IVA)</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>
                    <span className="visually-hidden">Acciones</span>
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {services.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  services.map((s) => (
                    <CTableRow key={s.id} onClick={() => openEdit(s)}>
                      <CTableDataCell className="text-body-secondary">{s.id}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{s.name}</strong>
                      </CTableDataCell>
                      <CTableDataCell>{fmtMoney(s.price)}</CTableDataCell>
                      <CTableDataCell>
                        <ActiveBadge active={s.isActive} />
                      </CTableDataCell>
                      <CTableDataCell className="text-end text-nowrap">
                        {deleteButton(s)}
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
          <ModalTitle>{formModal.service ? 'Editar servicio' : 'Nuevo servicio'}</ModalTitle>
        </CModalHeader>
        <ServiceForm
          key={formModal.service?.id ?? 'new'}
          service={formModal.service}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </Modal>

      <ConfirmDialog
        visible={deleteModal.visible}
        title="Eliminar servicio"
        confirmLabel="Eliminar"
        tone="danger"
        onClose={closeDelete}
        onConfirm={handleDelete}
        pending={deleteMutation.isPending}
      >
        ¿Eliminar el servicio <strong>{deleteModal.service?.name}</strong>? Esta acción no se puede
        deshacer.
      </ConfirmDialog>
    </>
  )
}

export default ServicesPage
