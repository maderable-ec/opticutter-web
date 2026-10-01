import { useId, useState, type FormEvent } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CModalBody,
  CModalFooter,
  CRow,
} from '@coreui/react'

import { ApiError } from 'src/shared/api/types'
import FieldError from 'src/shared/components/FieldError'
import type { AdditionalService, AdditionalServicePayload } from './types'
import Spinner from 'src/shared/components/Spinner'

interface FormState {
  name: string
  price: number | string
  isActive: boolean
}

const mapServerErrors = (error: Error | null): Record<string, string> => {
  if (!(error instanceof ApiError)) return {}
  const out: Record<string, string> = {}
  for (const e of error.errors) {
    if (e.field) out[e.field.replace(/^body\./, '')] = e.message
    else if (e.code === 'CONFLICT') out.name = e.message
  }
  return out
}

interface ServiceFormProps {
  service: AdditionalService | null
  onSubmit: (data: AdditionalServicePayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const ServiceForm = ({ service, onSubmit, onCancel, isSubmitting, error }: ServiceFormProps) => {
  const [form, setForm] = useState<FormState>({
    name: service?.name ?? '',
    price: service?.price ?? '',
    isActive: service?.isActive ?? true,
  })

  // Each label names its field, for a screen reader and for the tap on the label itself.
  const id = useId()
  const fieldErrors = mapServerErrors(error)
  const hasGenericError = error && Object.keys(fieldErrors).length === 0

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit({ name: form.name, price: Number(form.price), isActive: form.isActive })
  }

  return (
    <CForm onSubmit={handleSubmit} className="d-flex flex-column overflow-hidden">
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12}>
            <CFormLabel htmlFor={`${id}-name`}>
              Nombre <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              id={`${id}-name`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={128}
              placeholder="Ej: Perforación"
            />
            <FieldError name="name" errors={fieldErrors} />
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor={`${id}-price`}>
              Precio por defecto (IVA incluido) <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              id={`${id}-price`}
              type="number"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              min={0}
              step="0.01"
              placeholder="0.00"
            />
            <FieldError name="price" errors={fieldErrors} />
          </CCol>
          <CCol xs={12}>
            <CFormSwitch
              id={`${id}-active`}
              label="Activo"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          </CCol>
          {hasGenericError && (
            <CCol xs={12}>
              <div className="text-danger small">
                {error?.message || 'Error al guardar. Intente nuevamente.'}
              </div>
            </CCol>
          )}
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" /> : 'Guardar'}
        </CButton>
      </CModalFooter>
    </CForm>
  )
}

export default ServiceForm
