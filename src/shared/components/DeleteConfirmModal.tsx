import type { ReactNode } from 'react'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

interface DeleteConfirmModalProps {
  visible: boolean
  title: string
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
  // Confirmation copy (usually names the record being deleted).
  children: ReactNode
}

// Shared "delete this record?" confirmation modal used by the list pages.
const DeleteConfirmModal = ({
  visible,
  title,
  onConfirm,
  onClose,
  isPending,
  children,
}: DeleteConfirmModalProps) => (
  <CModal visible={visible} onClose={onClose}>
    <CModalHeader>
      <CModalTitle>{title}</CModalTitle>
    </CModalHeader>
    <CModalBody>{children}</CModalBody>
    <CModalFooter>
      <CButton color="secondary" onClick={onClose}>
        Cancelar
      </CButton>
      <CButton color="danger" onClick={onConfirm} disabled={isPending}>
        {isPending ? <CSpinner size="sm" /> : 'Eliminar'}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default DeleteConfirmModal
