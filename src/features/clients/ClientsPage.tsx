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

import ClientForm from './ClientForm'
import SyncClientsModal from './SyncClientsModal'
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from './useClients'
import ClientsFilters, { clientFilterParams, type ClientsFilterValues } from './ClientsFilters'
import type { Client, ClientPayload } from './types'
import { MASK, NO_CAPTURE } from 'src/shared/analytics'
import { clientName } from 'src/shared/utils/format'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import ListCard from 'src/shared/components/ListCard'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import type { ListSort } from 'src/shared/components/FilterSortSection'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

// Filter fields that live in the URL. Only the search box: a client has nothing else to narrow by.
const FILTER_KEYS = ['q']

interface ModalState {
  visible: boolean
  client: Client | null
}

const ClientsPage = () => {
  const { getParam, setParam, setParams, clearParams, offset, setOffset, limit, setLimit } =
    useListParams()

  const search = getParam('q')
  const values: ClientsFilterValues = {
    sort: (getParam('sort') || 'name') as ListSort,
  }

  const handleChange = <K extends keyof ClientsFilterValues>(
    key: K,
    value: ClientsFilterValues[K],
  ) => {
    setParam(key, value)
  }
  // The phone's sheet applies its draft in one url write, which also closes it.
  const handleApply = (next: ClientsFilterValues) =>
    setParams(
      { sort: next.sort === 'name' ? undefined : next.sort, [FILTER_SHEET_PARAM]: undefined },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const [formModal, setFormModal] = useState<ModalState>({ visible: false, client: null })
  const [deleteModal, setDeleteModal] = useState<ModalState>({ visible: false, client: null })
  const [syncModal, setSyncModal] = useState(false)
  const queryClient = useQueryClient()

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const {
    data: clientsData,
    isLoading,
    isError,
    refetch,
  } = useClients({ ...clientFilterParams(search), sort: values.sort, offset, limit })
  const clients = clientsData?.items ?? []
  const pagination = clientsData?.pagination

  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

  const openCreate = () => setFormModal({ visible: true, client: null })
  const openEdit = (client: Client) => setFormModal({ visible: true, client })
  const closeForm = () => {
    setFormModal({ visible: false, client: null })
    createMutation.reset()
    updateMutation.reset()
  }
  const openDelete = (client: Client) => setDeleteModal({ visible: true, client })
  const closeDelete = () => setDeleteModal({ visible: false, client: null })

  const handleSubmit = (data: ClientPayload) => {
    const { client } = formModal
    if (client) {
      updateMutation.mutate({ id: client.id, data }, { onSuccess: closeForm })
    } else {
      createMutation.mutate(data, { onSuccess: closeForm })
    }
  }

  const handleDelete = () => {
    if (!deleteModal.client) return
    deleteMutation.mutate(deleteModal.client.id, { onSuccess: closeDelete })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error

  // Two different dead ends: an empty catalog is a fact, an over-narrow search is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = search ? (
    <EmptyState
      icon="clearFilters"
      title="Ningún cliente coincide con la búsqueda."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar búsqueda
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Aún no hay clientes." />
  )

  // The row opens the editor, so only the destructive action keeps a button — and it must not also
  // open it on the way. Beside the card on a phone, in the last column from `md`.
  const deleteButton = (c: Client) => (
    <CButton
      variant="ghost"
      color="danger"
      size="sm"
      // Its aria-label names the client, which text masking does not reach.
      className={NO_CAPTURE}
      aria-label={`Eliminar ${clientName(c)}`}
      onClick={(e) => {
        e.stopPropagation()
        openDelete(c)
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
            placeholder="Buscar por nombre o identificador…"
          />
          <ClientsFilters
            values={values}
            search={search}
            onChange={handleChange}
            onApply={handleApply}
            onClear={handleClear}
          />
          <div className="d-flex gap-2 ms-auto">
            <CButton color="secondary" variant="outline" onClick={() => setSyncModal(true)}>
              <Icon name="sync" className="me-1" />
              Sincronizar<span className="d-none d-md-inline"> clientes</span>
            </CButton>
            <CButton color="primary" onClick={openCreate}>
              <Icon name="add" className="me-1" />
              Nuevo cliente
            </CButton>
          </div>
        </ListToolbar>

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one. On a phone the seven columns
              scrolled sideways past the phone and the e-mail — the reason to open a client there. */}
          <div className="d-md-none">
            {clients.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {clients.map((c) => (
                  <ListCard
                    key={c.id}
                    onClick={() => openEdit(c)}
                    title={<span {...MASK}>{clientName(c)}</span>}
                    meta={
                      <>
                        <span {...MASK}>{c.identifier}</span>
                        {c.phone && <span {...MASK}>{c.phone}</span>}
                        {c.email && <span {...MASK}>{c.email}</span>}
                      </>
                    }
                    action={deleteButton(c)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            <CTable align="middle" hover responsive className="list-table">
              <CTableHead>
                <CTableRow>
                  {/* The internal id and the source, from `lg`: on a portrait tablet, beside the menu's
                    rail, they took the width the e-mail needed. */}
                  <CTableHeaderCell className="d-none d-lg-table-cell">ID</CTableHeaderCell>
                  <CTableHeaderCell>Identificador</CTableHeaderCell>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Teléfono</CTableHeaderCell>
                  <CTableHeaderCell>Email</CTableHeaderCell>
                  <CTableHeaderCell className="d-none d-lg-table-cell">Fuente</CTableHeaderCell>
                  <CTableHeaderCell>
                    <span className="visually-hidden">Acciones</span>
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {clients.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  clients.map((c) => (
                    <CTableRow key={c.id} onClick={() => openEdit(c)}>
                      <CTableDataCell className="d-none d-lg-table-cell text-body-secondary">
                        {c.id}
                      </CTableDataCell>
                      <CTableDataCell {...MASK}>
                        <strong>{c.identifier}</strong>
                      </CTableDataCell>
                      <CTableDataCell {...MASK}>{clientName(c)}</CTableDataCell>
                      <CTableDataCell {...MASK}>{c.phone ?? '—'}</CTableDataCell>
                      <CTableDataCell {...MASK}>{c.email ?? '—'}</CTableDataCell>
                      <CTableDataCell className="d-none d-lg-table-cell">
                        {c.source ?? '—'}
                      </CTableDataCell>
                      <CTableDataCell className="text-end text-nowrap">
                        {deleteButton(c)}
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
          <ModalTitle>{formModal.client ? 'Editar cliente' : 'Nuevo cliente'}</ModalTitle>
        </CModalHeader>
        <ClientForm
          key={formModal.client?.id ?? 'new'}
          client={formModal.client}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </Modal>

      <ConfirmDialog
        visible={deleteModal.visible}
        title="Eliminar cliente"
        confirmLabel="Eliminar"
        tone="danger"
        onClose={closeDelete}
        onConfirm={handleDelete}
        pending={deleteMutation.isPending}
      >
        <span {...MASK}>
          ¿Eliminar a <strong>{deleteModal.client && clientName(deleteModal.client)}</strong> (
          {deleteModal.client?.identifier})? Esta acción no se puede deshacer.
        </span>
      </ConfirmDialog>

      <SyncClientsModal
        visible={syncModal}
        onClose={() => setSyncModal(false)}
        onSynced={() => void queryClient.invalidateQueries({ queryKey: ['clients'] })}
      />
    </>
  )
}

export default ClientsPage
