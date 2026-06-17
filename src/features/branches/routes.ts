import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const BranchesPage = lazy(() => import('./BranchesPage'))

export const branchesRoutes: AppRoute[] = [
  { path: '/branches', name: 'Sucursales', element: BranchesPage, roles: ['administrador'] },
]
