import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilSearch, cilTrash } from '@coreui/icons'

import ClientForm from './ClientForm'
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from './useClients'

const LIMIT = 20

const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'

const ClientsPage = () => {
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [formModal, setFormModal] = useState({ visible: false, client: null })
  const [deleteModal, setDeleteModal] = useState({ visible: false, client: null })

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(rawSearch)
      setSkip(0)
    }, 350)
    return () => clearTimeout(t)
  }, [rawSearch])

  const { data: clients = [], isLoading } = useClients({ search, skip, limit: LIMIT })
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

  const openCreate = () => setFormModal({ visible: true, client: null })
  const openEdit = (client) => setFormModal({ visible: true, client })
  const closeForm = () => {
    setFormModal({ visible: false, client: null })
    createMutation.reset()
    updateMutation.reset()
  }
  const openDelete = (client) => setDeleteModal({ visible: true, client })
  const closeDelete = () => setDeleteModal({ visible: false, client: null })

  const handleSubmit = (data) => {
    const { client } = formModal
    if (client) {
      updateMutation.mutate({ id: client.id, data }, { onSuccess: closeForm })
    } else {
      createMutation.mutate(data, { onSuccess: closeForm })
    }
  }

  const handleDelete = () => {
    deleteMutation.mutate(deleteModal.client.id, { onSuccess: closeDelete })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error
  const showPrev = skip > 0
  const showNext = clients.length === LIMIT

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Clientes</strong>
          <CButton color="primary" size="sm" onClick={openCreate}>
            <CIcon icon={cilPlus} className="me-1" />
            Nuevo cliente
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CInputGroup className="mb-3" style={{ maxWidth: 320 }}>
            <CInputGroupText>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder="Buscar por nombre o identificador…"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
          </CInputGroup>

          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <CTable align="middle" hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">ID</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Identificador</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Nombre</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Teléfono</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Email</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Fuente</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary" />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {clients.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="text-center text-body-secondary py-5">
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  clients.map((c) => (
                    <CTableRow key={c.id}>
                      <CTableDataCell className="text-body-secondary">{c.id}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{c.identifier}</strong>
                      </CTableDataCell>
                      <CTableDataCell>{fullName(c)}</CTableDataCell>
                      <CTableDataCell>{c.phone ?? '—'}</CTableDataCell>
                      <CTableDataCell>{c.email ?? '—'}</CTableDataCell>
                      <CTableDataCell>{c.source ?? '—'}</CTableDataCell>
                      <CTableDataCell className="text-end text-nowrap">
                        <CButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => openEdit(c)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          variant="ghost"
                          color="danger"
                          size="sm"
                          className="ms-1"
                          onClick={() => openDelete(c)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          )}

          {(showPrev || showNext) && (
            <div className="d-flex justify-content-end gap-2 mt-2">
              <CButton
                size="sm"
                color="secondary"
                disabled={!showPrev}
                onClick={() => setSkip(Math.max(0, skip - LIMIT))}
              >
                Anterior
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                disabled={!showNext}
                onClick={() => setSkip(skip + LIMIT)}
              >
                Siguiente
              </CButton>
            </div>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={formModal.visible} onClose={closeForm} backdrop="static">
        <CModalHeader>
          <CModalTitle>{formModal.client ? 'Editar cliente' : 'Nuevo cliente'}</CModalTitle>
        </CModalHeader>
        <ClientForm
          key={formModal.client?.id ?? 'new'}
          client={formModal.client}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </CModal>

      <CModal visible={deleteModal.visible} onClose={closeDelete}>
        <CModalHeader>
          <CModalTitle>Eliminar cliente</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Eliminar a <strong>{deleteModal.client && fullName(deleteModal.client)}</strong> (
          {deleteModal.client?.identifier})? Esta acción no se puede deshacer.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeDelete}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CSpinner size="sm" /> : 'Eliminar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ClientsPage
