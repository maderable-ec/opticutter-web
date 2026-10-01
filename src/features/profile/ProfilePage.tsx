import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CAlert, CButton, CCol, CForm, CFormInput, CFormLabel, CRow } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'
import { ApiError } from 'src/shared/api/types'
import { useCurrentUser } from 'src/features/auth/useAuth'
import { rolesLabel } from 'src/features/auth/roleLabels'
import { useSavedFlash } from 'src/features/settings/useSavedFlash'
import { useUpdateProfile } from './useProfile'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import Spinner from 'src/shared/components/Spinner'
import { useFromHere } from 'src/shared/hooks/useShellNav'

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })
}

const ProfilePage = () => {
  const user = useCurrentUser()
  const location = useLocation()
  const fromHere = useFromHere()
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged
  const update = useUpdateProfile()
  const [savedFlash, flashSaved] = useSavedFlash()
  const idPrefix = useId()

  const [fullName, setFullName] = useState(user?.fullName ?? '')

  if (!user) {
    return <LoadingBlock rows={4} />
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
        <section className="surface mb-3" aria-labelledby={`${idPrefix}-title`}>
          <h2 id={`${idPrefix}-title`} className="eyebrow mb-3">
            Mi perfil
          </h2>
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
                <CFormLabel htmlFor={`${idPrefix}-email`}>Email</CFormLabel>
                <CFormInput
                  id={`${idPrefix}-email`}
                  type="email"
                  value={user.email}
                  disabled
                  readOnly
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormLabel htmlFor={`${idPrefix}-roles`}>
                  {user.roles.length > 1 ? 'Roles' : 'Rol'}
                </CFormLabel>
                <CFormInput
                  id={`${idPrefix}-roles`}
                  value={rolesLabel(user.roles)}
                  disabled
                  readOnly
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormLabel htmlFor={`${idPrefix}-name`}>Nombre completo</CFormLabel>
                <CFormInput
                  id={`${idPrefix}-name`}
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
                <CFormLabel htmlFor={`${idPrefix}-since`}>Miembro desde</CFormLabel>
                <CFormInput
                  id={`${idPrefix}-since`}
                  value={formatDate(user.createdAt)}
                  disabled
                  readOnly
                />
              </CCol>
            </CRow>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4">
              <Link to="/profile/change-password" state={fromHere}>
                Cambiar contraseña
              </Link>
              <CButton color="primary" type="submit" disabled={!isDirty || update.isPending}>
                {update.isPending ? (
                  <Spinner size="sm" className="me-1" />
                ) : (
                  <Icon name={savedFlash ? 'check' : 'save'} className="me-1" />
                )}
                {savedFlash ? 'Guardado' : 'Guardar'}
              </CButton>
            </div>
          </CForm>
        </section>

        <p className="text-body-secondary small">
          <Icon name="lock" className="me-1" />
          El email y los roles los gestiona un administrador.
        </p>
      </CCol>
    </CRow>
  )
}

export default ProfilePage
