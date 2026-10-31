import { useId, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react'

import { apiErrorMessage } from 'src/shared/api/errors'
import Spinner from 'src/shared/components/Spinner'
import { Modal, ModalTitle } from 'src/shared/components/Modal'
import type { ModalContainer } from 'src/features/optimizer/types'

export interface ProjectDetails {
  name: string
  clientName: string | null
  notes: string | null
}

interface SaveProjectModalProps {
  visible: boolean
  // Saving and handing it to the sellers in one go: the button says so.
  andReady: boolean
  isSaving: boolean
  onSave: (details: ProjectDetails) => void
  container?: ModalContainer
  onClose: () => void
  error?: Error | null
}

const NAME_MAX = 128
const NOTES_MAX = 512

// The first save of a project: what it is called and who it is for. Afterwards «Guardar proyecto»
// only writes the despiece. The client is free text on purpose: the designer does not reach the
// clients, and the seller picks the real one when quoting.
const SaveProjectModal = ({
  visible,
  andReady,
  isSaving,
  onSave,
  container,
  onClose,
  error,
}: SaveProjectModalProps) => {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [notes, setNotes] = useState('')
  const nameId = useId()
  const clientId = useId()
  const notesId = useId()

  // Fresh fields each time it opens ("adjust state during render", as `SaveDraftModal` does).
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setName('')
      setClientName('')
      setNotes('')
    }
  }

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && !isSaving
  const errorMsg = apiErrorMessage(error ?? null)

  const handleSave = () => {
    if (!canSave) return
    onSave({
      name: trimmed,
      clientName: clientName.trim() || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <Modal visible={visible} onClose={onClose} alignment="center" container={container}>
      <CModalHeader>
        <ModalTitle>{andReady ? 'Guardar y marcar como listo' : 'Guardar proyecto'}</ModalTitle>
      </CModalHeader>
      <CModalBody>
        {errorMsg && (
          <CAlert color="danger" className="py-2">
            {errorMsg}
          </CAlert>
        )}
        <div className="mb-3">
          <CFormLabel htmlFor={nameId}>Nombre del proyecto</CFormLabel>
          <CFormInput
            id={nameId}
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Ej.: Cocina con isla"
          />
        </div>
        <div className="mb-3">
          <CFormLabel htmlFor={clientId}>Para quién es (opcional)</CFormLabel>
          <CFormInput
            id={clientId}
            value={clientName}
            maxLength={NAME_MAX}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ej.: Sra. Pérez"
          />
          <div className="form-text">El vendedor elige el cliente al cotizar.</div>
        </div>
        <div>
          <CFormLabel htmlFor={notesId}>Notas (opcional)</CFormLabel>
          <CFormTextarea
            id={notesId}
            rows={2}
            value={notes}
            maxLength={NOTES_MAX}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {andReady && (
          <p className="text-body-secondary small mt-3 mb-0">
            Al marcarlo como listo pasa a los vendedores para cotizarlo y ya no se edita, salvo que
            lo reabras.
          </p>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancelar
        </CButton>
        <CButton color="primary" disabled={!canSave} onClick={handleSave}>
          {isSaving ? <Spinner size="sm" /> : andReady ? 'Guardar y marcar como listo' : 'Guardar'}
        </CButton>
      </CModalFooter>
    </Modal>
  )
}

export default SaveProjectModal
