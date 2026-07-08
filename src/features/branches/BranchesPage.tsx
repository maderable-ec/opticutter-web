import { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSwitch,
  CInputGroup,
  CInputGroupText,
  CModal,
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
import { cilPencil, cilPlus, cilSearch } from '@coreui/icons'

import BranchForm from './BranchForm'
import { useBranches, useCreateBranch, useUpdateBranch } from './useBranches'
import type { Branch, BranchPayload, BranchUpdatePayload } from './types'
import { PAGE_SIZE } from 'src/shared/constants'
import { useDebounce } from 'src/shared/hooks/useDebounce'

interface ModalState {
  visible: boolean
  branch: Branch | null
}

const BranchesPage = () => {
  const [rawSearch, setRawSearch] = useState('')
  const search = useDebounce(rawSearch)
  const [offset, setOffset] = useState(0)
  const [formModal, setFormModal] = useState<ModalState>({ visible: false, branch: null })

  const { data, isLoading } = useBranches({ search, offset, limit: PAGE_SIZE })
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
      updateMutation.mutate(
        { id: branch.id, data: payload as BranchUpdatePayload },
        { onSuccess: closeForm },
      )
    } else {
      createMutation.mutate(payload as BranchPayload, { onSuccess: closeForm })
    }
  }

  // Soft-delete: the "Activa" toggle maps to isActive via PUT — DELETE is avoided to preserve FK integrity.
  const toggleActive = (branch: Branch) =>
    updateMutation.mutate({ id: branch.id, data: { isActive: !branch.isActive } })

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error
  const showPrev = offset > 0
  const showNext = pagination ? offset + PAGE_SIZE < pagination.total : false

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Sucursales</strong>
          <CButton color="primary" size="sm" onClick={openCreate}>
            <CIcon icon={cilPlus} className="me-1" />
            Nueva sucursal
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CInputGroup className="mb-3" style={{ maxWidth: 320 }}>
            <CInputGroupText>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder="Buscar por código o nombre…"
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
                  <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Nombre</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Dirección</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Teléfono</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Activa</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary" />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {branches.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary py-5">
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  branches.map((b) => (
                    <CTableRow key={b.id}>
                      <CTableDataCell className="fw-semibold">{b.code}</CTableDataCell>
                      <CTableDataCell>{b.name}</CTableDataCell>
                      <CTableDataCell>{b.address ?? '—'}</CTableDataCell>
                      <CTableDataCell>{b.phone ?? '—'}</CTableDataCell>
                      <CTableDataCell>
                        <CFormSwitch
                          checked={b.isActive}
                          disabled={updateMutation.isPending}
                          onChange={() => toggleActive(b)}
                          aria-label="Activa"
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end text-nowrap">
                        <CButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => openEdit(b)}
                        >
                          <CIcon icon={cilPencil} />
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
          <CModalTitle>{formModal.branch ? 'Editar sucursal' : 'Nueva sucursal'}</CModalTitle>
        </CModalHeader>
        <BranchForm
          key={formModal.branch?.id ?? 'new'}
          branch={formModal.branch}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </CModal>
    </>
  )
}

export default BranchesPage
