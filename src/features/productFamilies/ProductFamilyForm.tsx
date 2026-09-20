import { useState } from 'react'
import {
  CAlert,
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/react'
import { apiErrorMessage } from 'src/shared/api/errors'
import type { ProductFamily, ProductFamilyPayload } from './types'

interface ProductFamilyFormProps {
  family: ProductFamily | null
  onSubmit: (data: ProductFamilyPayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const ProductFamilyForm = ({
  family,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: ProductFamilyFormProps) => {
  const [name, setName] = useState(family?.name ?? '')
  const [description, setDescription] = useState(family?.description ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description: description.trim() || null })
  }

  return (
    <form onSubmit={handleSubmit}>
      <CModalBody>
        {error && <CAlert color="danger">{apiErrorMessage(error)}</CAlert>}

        <div className="mb-3">
          <CFormLabel htmlFor="family-name">Nombre del diseño</CFormLabel>
          <CFormInput
            id="family-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            required
            autoFocus
            placeholder="Olmo Panela"
          />
          {/* Renaming is one row now: it used to mean editing the text on every
              member, and missing one silently broke the pairing. */}
          <div className="form-text">
            Mayúsculas y espacios no cuentan: «Cashmere» y «CASHMERE» son la misma familia.
          </div>
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="family-description">Nota (opcional)</CFormLabel>
          <CFormTextarea
            id="family-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={256}
            placeholder="Sustituye a Roble Barroco, descontinuado"
          />
          <div className="form-text">
            Por qué existe o a qué sustituye, para quien tome el catálogo después.
          </div>
        </div>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting && <CSpinner size="sm" className="me-1" />}
          {family ? 'Guardar' : 'Crear familia'}
        </CButton>
      </CModalFooter>
    </form>
  )
}

export default ProductFamilyForm
