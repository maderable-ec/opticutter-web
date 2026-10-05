import { memo, Suspense } from 'react'
import { matchPath, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CContainer } from '@coreui/react'

import { routes } from '../routes'
import { LEGACY_REDIRECTS, legacyTarget } from '../legacyRoutes'
import { useAuthStore } from 'src/shared/store/authStore'
import { hasAnyRole, homePathForRoles } from 'src/features/auth/permissions'
import ErrorBoundary from './ErrorBoundary'
import Spinner from './Spinner'

// An old path (`LEGACY_REDIRECTS`) to where its screen lives now, with its query and the history
// state (the origin «Volver» reads) carried over.
const LegacyRedirect = () => {
  const location = useLocation()
  const to = legacyTarget(location.pathname) ?? '/'
  return (
    <Navigate
      to={{ pathname: to, search: location.search, hash: location.hash }}
      state={location.state as unknown}
      replace
    />
  )
}

const AppContent = () => {
  const userRoles = useAuthStore((s) => s.user?.roles)
  const location = useLocation()
  // Role-based home path: lands on an accessible route to avoid a / → (forbidden page) → / loop.
  const home = homePathForRoles(userRoles)
  // Routes that opt out of the centered container's max-width (see AppRoute.fluid).
  const fluid = routes.some((r) => r.fluid && matchPath(r.path, location.pathname))

  return (
    <CContainer className="px-2 px-md-4" {...(fluid ? { fluid: true } : { lg: true })}>
      {/* Keyed by pathname so navigating away from a crashed route clears the error state. */}
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<Spinner color="primary" />}>
          <Routes>
            {routes.map((route, idx) => {
              if (route.roles && !hasAnyRole(userRoles, route.roles)) {
                return (
                  <Route key={idx} path={route.path} element={<Navigate to={home} replace />} />
                )
              }
              return <Route key={idx} path={route.path} element={<route.element />} />
            })}
            {LEGACY_REDIRECTS.map(({ from }) => (
              <Route key={from} path={from} element={<LegacyRedirect />} />
            ))}
            <Route path="/" element={<Navigate to={home} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </CContainer>
  )
}

export default memo(AppContent)
