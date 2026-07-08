import { useMemo, useState } from 'react'
import {
  CBadge,
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

import UserForm from './UserForm'
import { useUsers, useCreateUser, useDeleteUser, useUpdateUser } from './useUsers'
import { useBranches } from 'src/features/branches/useBranches'
import type { User } from 'src/features/auth/types'
import type { UserPayload, UserUpdatePayload } from './types'
import { ROLE_COLORS, ROLE_SHORT_LABELS } from 'src/features/auth/roleLabels'
import { PAGE_SIZE } from 'src/shared/constants'
import { useDebounce } from 'src/shared/hooks/useDebounce'

interface ModalState {
  visible: boolean
  user: User | null
}

const UsersPage = () => {
  const [rawSearch, setRawSearch] = useState('')
  const search = useDebounce(rawSearch)
  const [offset, setOffset] = useState(0)
  const [formModal, setFormModal] = useState<ModalState>({ visible: false, user: null })
  const [deleteModal, setDeleteModal] = useState<ModalState>({ visible: false, user: null })

  const { data: usersData, isLoading } = useUsers({ search, offset, limit: PAGE_SIZE })
  const users = usersData?.items ?? []
  const pagination = usersData?.pagination

  // Resolve branchId → name (includes inactive branches to preserve labels for historical staff).
  const { data: branchesData } = useBranches({ limit: 100 })
  const branchName = useMemo(
    () => new Map((branchesData?.items ?? []).map((b) => [b.id, b.name])),
    [branchesData],
  )
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const openCreate = () => setFormModal({ visible: true, user: null })
  const openEdit = (user: User) => setFormModal({ visible: true, user })
  const closeForm = () => {
    setFormModal({ visible: false, user: null })
    createMutation.reset()
    updateMutation.reset()
  }
  const openDelete = (user: User) => setDeleteModal({ visible: true, user })
  const closeDelete = () => setDeleteModal({ visible: false, user: null })

  const handleSubmit = (data: UserPayload | UserUpdatePayload) => {
    const { user } = formModal
    if (user) {
      updateMutation.mutate(
        { id: user.id, data: data as UserUpdatePayload },
        { onSuccess: closeForm },
      )
    } else {
      createMutation.mutate(data as UserPayload, { onSuccess: closeForm })
    }
  }

  const handleDelete = () => {
    if (!deleteModal.user) return
    deleteMutation.mutate(deleteModal.user.id, { onSuccess: closeDelete })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error
  const showPrev = offset > 0
  const showNext = pagination ? offset + PAGE_SIZE < pagination.total : false

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Usuarios</strong>
          <CButton color="primary" size="sm" onClick={openCreate}>
            <CIcon icon={cilPlus} className="me-1" />
            Nuevo usuario
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CInputGroup className="mb-3" style={{ maxWidth: 320 }}>
            <CInputGroupText>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder="Buscar por nombre o email…"
              value={rawSearch}
              onChange={(e) => {
                setRawSearch(e.target.value)
                setOffset(0)
              }}
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
                  <CTableHeaderCell className="bg-body-tertiary">Email</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Nombre</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Rol</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Sucursal</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary" />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {users.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="text-center text-body-secondary py-5">
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  users.map((u) => (
                    <CTableRow key={u.id}>
                      <CTableDataCell className="text-body-secondary">{u.id}</CTableDataCell>
                      <CTableDataCell>{u.email}</CTableDataCell>
                      <CTableDataCell>{u.fullName ?? '—'}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={ROLE_COLORS[u.role] ?? 'secondary'}>
                          {ROLE_SHORT_LABELS[u.role] ?? u.role}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        {u.role === 'administrador'
                          ? 'Global'
                          : u.branchId != null
                            ? (branchName.get(u.branchId) ?? '—')
                            : '—'}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={u.isActive ? 'success' : 'secondary'}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-end text-nowrap">
                        <CButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => openEdit(u)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          variant="ghost"
                          color="danger"
                          size="sm"
                          className="ms-1"
                          onClick={() => openDelete(u)}
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
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Anterior
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                disabled={!showNext}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Siguiente
              </CButton>
            </div>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={formModal.visible} onClose={closeForm} backdrop="static">
        <CModalHeader>
          <CModalTitle>{formModal.user ? 'Editar usuario' : 'Nuevo usuario'}</CModalTitle>
        </CModalHeader>
        <UserForm
          key={formModal.user?.id ?? 'new'}
          user={formModal.user}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </CModal>

      <CModal visible={deleteModal.visible} onClose={closeDelete}>
        <CModalHeader>
          <CModalTitle>Eliminar usuario</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Eliminar a <strong>{deleteModal.user?.fullName ?? deleteModal.user?.email}</strong>? Esta
          acción no se puede deshacer.
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

export default UsersPage
