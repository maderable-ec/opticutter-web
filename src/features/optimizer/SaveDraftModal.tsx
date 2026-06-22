import { useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { useCurrentUser, useHasRole, useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { ApiError } from 'src/shared/api/types'

interface SaveDraftModalProps {
  visible: boolean
  isSaving: boolean
  // El admin (global) debe elegir sucursal; para staff llega null y no se envía.
  onSave: (name: string, branchId: number | null) => void
  onClose: () => void
  error?: Error | null
}

const NAME_MAX = 128

// Sugerencia por defecto: "Borrador 14/06/2026".
const suggestedName = () =>
  `Borrador ${new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`

const SaveDraftModal = ({ visible, isSaving, onSave, onClose, error }: SaveDraftModalProps) => {
  const [name, setName] = useState(suggestedName)

  const user = useCurrentUser()
  const isAdmin = useHasRole('administrador')
  const isGlobalBranch = useIsGlobalBranchRole()
  const { data: branches = [] } = useActiveBranches()

  // Admin: sin preselección (campo obligatorio). Vendedor: preselecciona su sucursal base.
  const defaultBranchId = isAdmin ? '' : String(user?.branchId ?? '')
  const [branchId, setBranchId] = useState(defaultBranchId)

  // Reinicia el estado cada vez que se abre el modal (patrón "ajustar estado al cambiar una
  // prop" durante el render, en vez de un efecto: https://react.dev/learn/you-might-not-need-an-effect).
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setName(suggestedName())
      setBranchId(defaultBranchId)
    }
  }

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && !isSaving && (!isAdmin || !!branchId)

  const branchError =
    error instanceof ApiError
      ? error.errors.find((e) => e.field === 'branchId')?.message
      : undefined

  const handleSave = () => {
    if (!canSave) return
    onSave(trimmed, isGlobalBranch && branchId ? Number(branchId) : null)
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
        {isGlobalBranch && (
          <>
            <CFormLabel className="mt-3">
              Sucursal {isAdmin && <span className="text-danger">*</span>}
            </CFormLabel>
            <CFormSelect
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              invalid={!!branchError}
            >
              <option value="">— Seleccionar sucursal —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </CFormSelect>
            {branchError && <div className="invalid-feedback d-block">{branchError}</div>}
          </>
        )}
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
