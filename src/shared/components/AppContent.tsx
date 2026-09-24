import { memo, Suspense } from 'react'
import { matchPath, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

import { routes } from '../routes'
import { useAuthStore } from 'src/shared/store/authStore'
import { hasAnyRole, homePathForRoles } from 'src/features/auth/permissions'
import ErrorBoundary from './ErrorBoundary'

const AppContent = () => {
  const userRoles = useAuthStore((s) => s.user?.roles)
  const location = useLocation()
  // Role-based home path: lands on an accessible route to avoid the / → /dashboard → / redirect loop.
  const home = homePathForRoles(userRoles)
  // Routes that opt out of the centered container's max-width (see AppRoute.fluid).
  const fluid = routes.some((r) => r.fluid && matchPath(r.path, location.pathname))

  return (
    <CContainer className="px-2 px-md-4" {...(fluid ? { fluid: true } : { lg: true })}>
      {/* Keyed by pathname so navigating away from a crashed route clears the error state. */}
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<CSpinner color="primary" />}>
          <Routes>
            {routes.map((route, idx) => {
              if (!route.element) return null
              if (route.roles && !hasAnyRole(userRoles, route.roles)) {
                return (
                  <Route key={idx} path={route.path} element={<Navigate to={home} replace />} />
                )
              }
              return <Route key={idx} path={route.path} element={<route.element />} />
            })}
            <Route path="/" element={<Navigate to={home} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </CContainer>
  )
}

export default memo(AppContent)
