import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const HomePage = lazy(() => import('./HomePage'))

export const homeRoutes: AppRoute[] = [
  // The home of the office roles (`homePathForRoles`); the shop floor's is the workshop board.
  { path: '/inicio', name: 'Inicio', element: HomePage, roles: ['administrador', 'vendedor'] },
]
