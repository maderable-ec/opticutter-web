import {
  CButton,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react'
import { useDeleteDraft, useDrafts } from './useDrafts'

import Icon from 'src/shared/icons/Icon'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { useState } from 'react'
import { MASK } from 'src/shared/analytics'
import { fmtDate } from 'src/shared/utils/format'
import type { ModalContainer } from './types'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import Spinner from 'src/shared/components/Spinner'
import { Modal, ModalTitle } from 'src/shared/components/Modal'
import { useConfirm } from 'src/shared/hooks/useConfirm'

interface DraftsModalProps {
  visible: boolean
  loadingId: number | null
  onLoad: (id: number) => void
  container?: ModalContainer
  onClose: () => void
}

const DraftsModal = ({ visible, loadingId, onLoad, container, onClose }: DraftsModalProps) => {
  const isGlobalBranch = useIsGlobalBranchRole()
  const [branchId, setBranchId] = useState('')
  const { data: branches = [] } = useActiveBranches()
  const { data, isLoading } = useDrafts(branchId ? Number(branchId) : undefined)
  const deleteDraft = useDeleteDraft()
  const drafts = data?.items ?? []

  // Asked from inside this dialog, so the question mounts inside it (see `ConfirmDialog`).
  const [confirm, confirmDialog] = useConfirm()
  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Eliminar borrador',
      body: (
        <>
          <strong {...MASK}>{name}</strong> se borra y no puede recuperarse.
        </>
      ),
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (ok) deleteDraft.mutate(id)
  }

  return (
    <Modal visible={visible} onClose={onClose} size="lg" alignment="center" container={container}>
      <CModalHeader>
        <ModalTitle>Borradores guardados</ModalTitle>
      </CModalHeader>
      <CModalBody>
        {isGlobalBranch && (
          <CFormSelect
            className="mb-3"
            aria-label="Sucursal"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </CFormSelect>
        )}
        {isLoading ? (
          <LoadingBlock rows={4} />
        ) : drafts.length === 0 ? (
          <p className="text-body-secondary text-center py-4 mb-0">
            No tienes borradores guardados todavía. Usa «Guardar borrador» para conservar tu trabajo
            y retomarlo después.
          </p>
        ) : (
          <CListGroup>
            {drafts.map((d) => {
              const isLoadingThis = loadingId === d.id
              const isDeletingThis = deleteDraft.isPending && deleteDraft.variables === d.id
              return (
                <CListGroupItem
                  key={d.id}
                  className="d-flex align-items-center justify-content-between gap-2"
                >
                  <div style={{ minWidth: 0 }}>
                    {/* Named by the seller, often after the client: masked in session replay. */}
                    <div className="fw-semibold text-truncate" {...MASK}>
                      {d.name}
                    </div>
                    <div className="small text-body-secondary">
                      {d.branch.name} · Actualizado el {fmtDate(d.updatedAt)}
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    <CButton
                      color="primary"
                      size="sm"
                      disabled={isLoadingThis}
                      onClick={() => onLoad(d.id)}
                    >
                      {isLoadingThis ? <Spinner size="sm" /> : 'Cargar'}
                    </CButton>
                    <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      disabled={isDeletingThis}
                      aria-label="Eliminar borrador"
                      onClick={() => void handleDelete(d.id, d.name)}
                    >
                      {isDeletingThis ? <Spinner size="sm" /> : <Icon name="delete" />}
                    </CButton>
                  </div>
                </CListGroupItem>
              )
            })}
          </CListGroup>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cerrar
        </CButton>
      </CModalFooter>
      {confirmDialog}
    </Modal>
  )
}

export default DraftsModal
