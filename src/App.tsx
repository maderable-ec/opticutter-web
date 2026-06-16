import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import useUIStore from 'src/shared/store/uiStore'
import { useAuthStore } from 'src/shared/store/authStore'
import { authApi } from 'src/features/auth/authApi'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'
import './scss/examples.scss'

import { authRoutes } from 'src/features/auth/routes'
import { reviewRoutes } from 'src/features/review/routes'

// Public routes rendered standalone (without the admin layout).
const publicRoutes = [...authRoutes, ...reviewRoutes]

const DefaultLayout = lazy(() => import('src/shared/layout/DefaultLayout'))

const SessionRestorer = () => {
  const { status, setUser, setStatus, clearSession } = useAuthStore()

  useEffect(() => {
    if (status !== 'loading') return
    authApi
      .me()
      .then((user) => {
        setUser(user)
        setStatus('authenticated')
      })
      .catch(() => clearSession())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useUIStore((state) => state.theme)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const rawTheme = urlParams.get('theme')
    const theme = rawTheme?.match(/^[A-Za-z0-9\s]+/)?.[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HashRouter>
      <SessionRestorer />
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {publicRoutes.map((route) => {
            const Element = route.element
            return Element ? (
              <Route key={route.path} path={route.path} element={<Element />} />
            ) : null
          })}
          <Route
            path="*"
            element={
              <RequireAuth>
                <DefaultLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
