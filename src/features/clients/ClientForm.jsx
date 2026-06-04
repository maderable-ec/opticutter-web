import React, { useState } from 'react'
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

const DEFAULT_SOURCE = 'dashboard'

const EMPTY = { identifier: '', firstName: '', lastName: '', phone: '', email: '' }

const ClientForm = ({ client, onSubmit, onCancel, isSubmitting, error }) => {
  const [form, setForm] = useState(
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

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { identifier: form.identifier, source: client?.source ?? DEFAULT_SOURCE }
    ;['firstName', 'lastName', 'phone', 'email'].forEach((k) => {
      data[k] = form[k] || null
    })
    onSubmit(data)
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
              <div className="text-danger small">Error al guardar. Intente nuevamente.</div>
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
