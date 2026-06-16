import { memo, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

import { routes } from '../routes'
import { useAuthStore } from 'src/shared/store/authStore'

const AppContent = () => {
  const userRole = useAuthStore((s) => s.user?.role)

  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            if (!route.element) return null
            if (route.roles && (!userRole || !route.roles.includes(userRole))) {
              return <Route key={idx} path={route.path} element={<Navigate to="/" replace />} />
            }
            return <Route key={idx} path={route.path} element={<route.element />} />
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default memo(AppContent)
