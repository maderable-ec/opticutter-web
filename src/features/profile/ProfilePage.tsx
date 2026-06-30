import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckAlt, cilLockLocked, cilSave } from '@coreui/icons'
import { ApiError } from 'src/shared/api/types'
import { useCurrentUser } from 'src/features/auth/useAuth'
import { ROLE_LABELS } from 'src/features/auth/roleLabels'
import { useSavedFlash } from 'src/features/settings/useSavedFlash'
import { useUpdateProfile } from './useProfile'

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })
}

const ProfilePage = () => {
  const user = useCurrentUser()
  const location = useLocation()
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged
  const update = useUpdateProfile()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [fullName, setFullName] = useState(user?.fullName ?? '')

  if (!user) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)
    update.reset()
  }

  const isDirty = fullName.trim() !== (user.fullName ?? '')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isDirty) return
    update.mutate({ fullName: fullName.trim() || null }, { onSuccess: () => flashSaved() })
  }

  const errorMsg =
    update.error instanceof ApiError
      ? (update.error.errors[0]?.message ?? update.error.message)
      : update.error
        ? 'Error al guardar. Intenta nuevamente.'
        : null

  return (
    <CRow className="justify-content-center">
      <CCol xs={12} md={8} lg={6}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Mi perfil</strong>
          </CCardHeader>
          <CCardBody>
            {passwordChanged && (
              <CAlert color="success" className="py-2">
                Contraseña actualizada correctamente.
              </CAlert>
            )}
            {savedFlash && (
              <CAlert color="success" className="py-2">
                Perfil actualizado correctamente.
              </CAlert>
            )}
            {errorMsg && (
              <CAlert color="danger" className="py-2">
                {errorMsg}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <CRow className="g-3">
                <CCol xs={12} md={6}>
                  <CFormLabel>Email</CFormLabel>
                  <CFormInput type="email" value={user.email} disabled readOnly />
                </CCol>
                <CCol xs={12} md={6}>
                  <CFormLabel>Rol</CFormLabel>
                  <CFormInput value={ROLE_LABELS[user.role]} disabled readOnly />
                </CCol>
                <CCol xs={12} md={6}>
                  <CFormLabel>Nombre completo</CFormLabel>
                  <CFormInput
                    type="text"
                    value={fullName}
                    maxLength={128}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    onChange={onChange}
                    disabled={update.isPending}
                  />
                </CCol>
                <CCol xs={12} md={6}>
                  <CFormLabel>Miembro desde</CFormLabel>
                  <CFormInput value={formatDate(user.createdAt)} disabled readOnly />
                </CCol>
              </CRow>

              <div className="d-flex justify-content-between align-items-center mt-4">
                <Link to="/profile/change-password">Cambiar contraseña</Link>
                <CButton color="primary" type="submit" disabled={!isDirty || update.isPending}>
                  {update.isPending ? (
                    <CSpinner size="sm" className="me-1" />
                  ) : (
                    <CIcon icon={savedFlash ? cilCheckAlt : cilSave} className="me-1" />
                  )}
                  {savedFlash ? 'Guardado' : 'Guardar'}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>

        <div className="text-body-secondary small">
          <CIcon icon={cilLockLocked} className="me-1" />
          El email y el rol los gestiona un administrador.
        </div>
      </CCol>
    </CRow>
  )
}

export default ProfilePage
