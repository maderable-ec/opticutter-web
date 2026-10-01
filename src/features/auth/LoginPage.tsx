import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import BrandMark from 'src/shared/icons/BrandMark'
import Icon from 'src/shared/icons/Icon'
import { useLogin } from './useAuth'
import { ApiError } from 'src/shared/api/types'
import PasswordInput from 'src/shared/components/PasswordInput'
import Spinner from 'src/shared/components/Spinner'
import { useDocumentTitle } from 'src/shared/hooks/useDocumentTitle'

const LoginPage = () => {
  useDocumentTitle('Iniciar sesión · Maderable')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/'

  const login = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => void navigate(from, { replace: true }) })
  }

  const errorMsg =
    login.error instanceof ApiError
      ? (login.error.errors[0]?.message ?? login.error.message)
      : login.error
        ? 'Error inesperado. Intente nuevamente.'
        : null

  return (
    <main className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          {/* 7 of 12 at 768: at 5 the card was 300px and «Iniciar sesión» broke in two. */}
          <CCol md={7} lg={5} xl={4}>
            {/* The full letterhead lockup — isotype over wordmark — rather than the wordmark alone
                the header and the review page use. This is the one screen with room for it, and the
                first thing anyone sees of the app. */}
            <div className="text-center mb-4">
              <BrandMark mark="sygnet" height={56} className="d-block mx-auto mb-3" />
              <BrandMark mark="logo" height={44} />
            </div>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit}>
                  <h1>Iniciar sesión</h1>
                  <p className="text-body-secondary mb-4">Ingresa con tu cuenta</p>

                  {errorMsg && (
                    <CAlert color="danger" className="py-2">
                      {errorMsg}
                    </CAlert>
                  )}

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <Icon name="email" />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={login.isPending}
                    />
                  </CInputGroup>

                  <PasswordInput
                    className="mb-4"
                    startIcon={<Icon name="lock" />}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={login.isPending}
                  />

                  <CButton
                    color="primary"
                    type="submit"
                    className="w-100"
                    disabled={login.isPending}
                  >
                    {login.isPending ? <Spinner size="sm" /> : 'Entrar'}
                  </CButton>
                </CForm>
              </CCardBody>
            </CCard>
            {/* The credit that used to sit in a footer under every screen: here it costs nothing. */}
            <p className="text-center text-body-secondary small mt-4 mb-0">
              Powered by Denis Siavichay
            </p>
          </CCol>
        </CRow>
      </CContainer>
    </main>
  )
}

export default LoginPage
