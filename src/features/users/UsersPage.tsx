import { useMemo, useState } from 'react'
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

import UserForm from './UserForm'
import { useUsers, useCreateUser, useDeleteUser, useUpdateUser } from './useUsers'
import { useBranches } from 'src/features/branches/useBranches'
import UsersFilters, {
  activeCount,
  userFilterParams,
  useUsersFilterChips,
  type UsersFilterValues,
} from './UsersFilters'
import type { Role, User } from 'src/features/auth/types'
import type { UserPayload, UserUpdatePayload } from './types'
import RoleBadge from 'src/features/analytics/components/RoleBadge'
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
const FILTER_KEYS = ['q', 'role', 'branchId', 'isActive']

interface ModalState {
  visible: boolean
  user: User | null
}

const UsersPage = () => {
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
  const values: UsersFilterValues = {
    role: getParams('role') as Role[],
    branchId: getParam('branchId'),
    isActive: getParam('isActive'),
    sort: (getParam('sort') || 'name') as ListSort,
  }

  const handleChange = <K extends keyof UsersFilterValues>(key: K, value: UsersFilterValues[K]) => {
    setParam(key, value)
  }
  // The phone's sheet applies its draft in one url write, which also closes it.
  const handleApply = (next: UsersFilterValues) =>
    setParams(
      {
        ...next,
        sort: next.sort === 'name' ? undefined : next.sort,
        [FILTER_SHEET_PARAM]: undefined,
      },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const chips = useUsersFilterChips(values, handleChange)
  const isFiltered = activeCount(values) > 0 || search !== ''

  const [formModal, setFormModal] = useState<ModalState>({ visible: false, user: null })
  const [deleteModal, setDeleteModal] = useState<ModalState>({ visible: false, user: null })

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const {
    data: usersData,
    isLoading,
    isError,
    refetch,
  } = useUsers({ ...userFilterParams(values, search), sort: values.sort, offset, limit })
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
      updateMutation.mutate({ id: user.id, data: data }, { onSuccess: closeForm })
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

  // An administrador is global; everybody else works at one branch.
  const branchOf = (u: User) =>
    u.roles.includes('administrador')
      ? 'Global'
      : u.branchId != null
        ? (branchName.get(u.branchId) ?? '—')
        : '—'

  // Two different dead ends: an empty catalog is a fact, an over-narrow filter is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ningún usuario coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Aún no hay usuarios." />
  )

  // The row opens the editor, so only the destructive action keeps a button — and it must not also
  // open it on the way. In the last column from `md`, beside the card on a phone.
  const deleteButton = (u: User) => (
    <CButton
      variant="ghost"
      color="danger"
      size="sm"
      aria-label={`Eliminar ${u.fullName ?? u.email}`}
      onClick={(e) => {
        e.stopPropagation()
        openDelete(u)
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
            placeholder="Buscar por nombre o email…"
          />
          <UsersFilters
            values={values}
            search={search}
            onChange={handleChange}
            onApply={handleApply}
            onClear={handleClear}
          />
          <CButton color="primary" className="ms-auto" onClick={openCreate}>
            <Icon name="add" className="me-1" />
            Nuevo usuario
          </CButton>
        </ListToolbar>

        <FilterChips chips={chips} onClearAll={handleClear} />

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one. */}
          <div className="d-md-none">
            {users.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {users.map((u) => (
                  <ListCard
                    key={u.id}
                    onClick={() => openEdit(u)}
                    title={u.fullName ?? u.email}
                    badges={
                      <>
                        <RoleBadge roles={u.roles} />
                        {/* Only the exception: «Activo» on every row says nothing. */}
                        {!u.isActive && <ActiveBadge active={false} />}
                      </>
                    }
                    meta={
                      <>
                        {u.fullName && <span>{u.email}</span>}
                        <span>{branchOf(u)}</span>
                      </>
                    }
                    action={deleteButton(u)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            <CTable align="middle" hover responsive className="list-table">
              <CTableHead>
                <CTableRow>
                  {/* The internal id and the branch, from `lg`: on a portrait tablet, beside the menu's
                    rail, the table scrolled sideways. */}
                  <CTableHeaderCell className="d-none d-lg-table-cell">ID</CTableHeaderCell>
                  <CTableHeaderCell>Email</CTableHeaderCell>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Roles</CTableHeaderCell>
                  <CTableHeaderCell className="d-none d-lg-table-cell">Sucursal</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>
                    <span className="visually-hidden">Acciones</span>
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {users.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  users.map((u) => (
                    <CTableRow key={u.id} onClick={() => openEdit(u)}>
                      <CTableDataCell className="d-none d-lg-table-cell text-body-secondary">
                        {u.id}
                      </CTableDataCell>
                      <CTableDataCell>{u.email}</CTableDataCell>
                      <CTableDataCell>{u.fullName ?? '—'}</CTableDataCell>
                      <CTableDataCell>
                        <RoleBadge roles={u.roles} />
                      </CTableDataCell>
                      <CTableDataCell className="d-none d-lg-table-cell">
                        {branchOf(u)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <ActiveBadge active={u.isActive} />
                      </CTableDataCell>
                      <CTableDataCell className="text-end text-nowrap">
                        {deleteButton(u)}
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
          <ModalTitle>{formModal.user ? 'Editar usuario' : 'Nuevo usuario'}</ModalTitle>
        </CModalHeader>
        <UserForm
          key={formModal.user?.id ?? 'new'}
          user={formModal.user}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </Modal>

      <ConfirmDialog
        visible={deleteModal.visible}
        title="Eliminar usuario"
        confirmLabel="Eliminar"
        tone="danger"
        onClose={closeDelete}
        onConfirm={handleDelete}
        pending={deleteMutation.isPending}
      >
        ¿Eliminar a <strong>{deleteModal.user?.fullName ?? deleteModal.user?.email}</strong>? Esta
        acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )
}

export default UsersPage
