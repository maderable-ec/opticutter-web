import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const UsersPage = lazy(() => import('./UsersPage'))

export const usersRoutes: AppRoute[] = [
  { path: '/users', name: 'Usuarios', element: UsersPage, roles: ['administrador'] },
]
