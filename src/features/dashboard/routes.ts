import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const DashboardPage = lazy(() => import('./DashboardPage'))

export const dashboardRoutes: AppRoute[] = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: DashboardPage, roles: ['administrador'] },
]
