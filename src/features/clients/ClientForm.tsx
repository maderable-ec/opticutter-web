import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CModalBody,
  CModalFooter,
  CRow,
} from '@coreui/react'
import { apiErrorMessage } from 'src/shared/api/errors'
import { identifierError } from './taxId'
import type { Client, ClientPayload } from './types'
import Spinner from 'src/shared/components/Spinner'

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

  // Each label names its field, for a screen reader and for the tap on the label itself.
  const id = useId()

  const set = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const errorMsg = apiErrorMessage(error, 'Error al guardar. Intente nuevamente.')

  // Checked here so a mistyped cédula is caught while the operator still has the document in front
  // of them; the server answers 422 on the same rule and stays the authority. Only shown once the
  // field has something in it — flagging an empty form the moment it opens reads as an error the
  // user made.
  const identifierMsg = form.identifier.trim() ? identifierError(form.identifier) : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (identifierMsg) return
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
    <CForm onSubmit={handleSubmit} className="d-flex flex-column overflow-hidden">
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12}>
            <CFormLabel htmlFor={`${id}-identifier`}>
              Identificador <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              id={`${id}-identifier`}
              value={form.identifier}
              onChange={set('identifier')}
              required
              maxLength={32}
              invalid={!!identifierMsg}
              placeholder="Ej: 0105929863"
            />
            {identifierMsg ? (
              <div className="invalid-feedback d-block">{identifierMsg}</div>
            ) : (
              <div className="form-text">
                Cédula o RUC. Un documento extranjero (pasaporte) se acepta tal cual.
              </div>
            )}
          </CCol>
          <CCol xs={6}>
            <CFormLabel htmlFor={`${id}-first`}>Nombre</CFormLabel>
            <CFormInput
              id={`${id}-first`}
              value={form.firstName}
              onChange={set('firstName')}
              maxLength={64}
            />
          </CCol>
          <CCol xs={6}>
            <CFormLabel htmlFor={`${id}-last`}>Apellido</CFormLabel>
            <CFormInput
              id={`${id}-last`}
              value={form.lastName}
              onChange={set('lastName')}
              maxLength={64}
            />
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor={`${id}-phone`}>Teléfono</CFormLabel>
            {/* `tel`: the phone keypad, not the full keyboard. */}
            <CFormInput
              id={`${id}-phone`}
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              maxLength={32}
            />
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor={`${id}-email`}>Email</CFormLabel>
            <CFormInput
              id={`${id}-email`}
              type="email"
              value={form.email}
              onChange={set('email')}
              maxLength={128}
            />
          </CCol>
          {errorMsg && (
            <CCol xs={12}>
              <div className="text-danger small">{errorMsg}</div>
            </CCol>
          )}
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting || !!identifierMsg}>
          {isSubmitting ? <Spinner size="sm" /> : 'Guardar'}
        </CButton>
      </CModalFooter>
    </CForm>
  )
}

export default ClientForm
