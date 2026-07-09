import { useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/react'
import { apiErrorMessage } from 'src/shared/api/errors'
import type { Branch, BranchPayload, BranchUpdatePayload } from './types'

interface BranchFormProps {
  branch: Branch | null
  onSubmit: (data: BranchPayload | BranchUpdatePayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const BranchForm = ({ branch, onSubmit, onCancel, isSubmitting, error }: BranchFormProps) => {
  const isEdit = branch !== null

  const [code, setCode] = useState(branch?.code ?? '')
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [isActive, setIsActive] = useState(branch?.isActive ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      const payload: BranchUpdatePayload = {
        code,
        name,
        address: address || undefined,
        phone: phone || undefined,
        isActive,
      }
      onSubmit(payload)
    } else {
      const payload: BranchPayload = {
        code,
        name,
        address: address || undefined,
        phone: phone || undefined,
      }
      onSubmit(payload)
    }
  }

  // 409 CONFLICT (duplicate code) and other API errors are surfaced via ApiError.
  const errorMsg = apiErrorMessage(error)

  return (
    <form onSubmit={handleSubmit}>
      <CModalBody>
        {errorMsg && (
          <CAlert color="danger" className="py-2">
            {errorMsg}
          </CAlert>
        )}

        <div className="mb-3">
          <CFormLabel htmlFor="bf-code">Código</CFormLabel>
          <CFormInput
            id="bf-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="bf-name">Nombre</CFormLabel>
          <CFormInput
            id="bf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="bf-address">Dirección</CFormLabel>
          <CFormInput
            id="bf-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="bf-phone">Teléfono</CFormLabel>
          <CFormInput
            id="bf-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {isEdit && (
          <div className="mb-3">
            <CFormCheck
              id="bf-active"
              label="Activa"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
            />
          </div>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <CSpinner size="sm" /> : isEdit ? 'Guardar' : 'Crear'}
        </CButton>
      </CModalFooter>
    </form>
  )
}

export default BranchForm
