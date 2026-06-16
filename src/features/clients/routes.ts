import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const ClientsPage = lazy(() => import('./ClientsPage'))

export const clientsRoutes: AppRoute[] = [
  {
    path: '/clients',
    name: 'Clientes',
    element: ClientsPage,
    roles: ['administrador', 'vendedor'],
  },
]
