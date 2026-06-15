import { useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

interface SaveDraftModalProps {
  visible: boolean
  isSaving: boolean
  onSave: (name: string) => void
  onClose: () => void
}

const NAME_MAX = 128

// Sugerencia por defecto: "Borrador 14/06/2026".
const suggestedName = () =>
  `Borrador ${new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`

const SaveDraftModal = ({ visible, isSaving, onSave, onClose }: SaveDraftModalProps) => {
  const [name, setName] = useState(suggestedName)

  // Reinicia el nombre sugerido cada vez que se abre el modal (patrón "ajustar estado al cambiar una
  // prop" durante el render, en vez de un efecto: https://react.dev/learn/you-might-not-need-an-effect).
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) setName(suggestedName())
  }

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && !isSaving

  const handleSave = () => {
    if (!canSave) return
    onSave(trimmed)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Guardar borrador</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CFormLabel>Nombre del borrador</CFormLabel>
        <CFormInput
          autoFocus
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Ej.: Cocina familia Pérez"
        />
        <p className="text-body-secondary small mt-2 mb-0">
          Se guarda el estado actual (materiales y piezas) para retomarlo después.
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancelar
        </CButton>
        <CButton color="primary" disabled={!canSave} onClick={handleSave}>
          {isSaving ? <CSpinner size="sm" /> : 'Guardar'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default SaveDraftModal
