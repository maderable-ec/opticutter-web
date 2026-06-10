import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CModalBody,
  CModalFooter,
  CRow,
  CSpinner,
} from '@coreui/react'
import type { Client, ClientPayload } from './types'

const DEFAULT_SOURCE = 'dashboard'

interface FormState {
  identifier: string
  firstName: string
  lastName: string
  phone: string
  email: string
}

const EMPTY: FormState = { identifier: '', firstName: '', lastName: '', phone: '', email: '' }

interface ClientFormProps {
  client: Client | null
  onSubmit: (data: ClientPayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const ClientForm = ({ client, onSubmit, onCancel, isSubmitting, error }: ClientFormProps) => {
  const [form, setForm] = useState<FormState>(
    client
      ? {
          identifier: client.identifier ?? '',
          firstName: client.firstName ?? '',
          lastName: client.lastName ?? '',
          phone: client.phone ?? '',
          email: client.email ?? '',
        }
      : EMPTY,
  )

  const set = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({
      identifier: form.identifier,
      source: client?.source ?? DEFAULT_SOURCE,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      phone: form.phone || null,
      email: form.email || null,
    })
  }

  return (
    <CForm onSubmit={handleSubmit}>
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12}>
            <CFormLabel>
              Identificador <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              value={form.identifier}
              onChange={set('identifier')}
              required
              maxLength={32}
              placeholder="Ej: 541155667788"
            />
          </CCol>
          <CCol xs={6}>
            <CFormLabel>Nombre</CFormLabel>
            <CFormInput value={form.firstName} onChange={set('firstName')} maxLength={64} />
          </CCol>
          <CCol xs={6}>
            <CFormLabel>Apellido</CFormLabel>
            <CFormInput value={form.lastName} onChange={set('lastName')} maxLength={64} />
          </CCol>
          <CCol xs={12}>
            <CFormLabel>Teléfono</CFormLabel>
            <CFormInput value={form.phone} onChange={set('phone')} maxLength={32} />
          </CCol>
          <CCol xs={12}>
            <CFormLabel>Email</CFormLabel>
            <CFormInput type="email" value={form.email} onChange={set('email')} maxLength={128} />
          </CCol>
          {error && (
            <CCol xs={12}>
              <div className="text-danger small">
                {error.message || 'Error al guardar. Intente nuevamente.'}
              </div>
            </CCol>
          )}
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" type="button" onClick={onCancel}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <CSpinner size="sm" /> : 'Guardar'}
        </CButton>
      </CModalFooter>
    </CForm>
  )
}

export default ClientForm
