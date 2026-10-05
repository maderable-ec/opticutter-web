import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const PrintAgentsPage = lazy(() => import('./PrintAgentsPage'))

export const printRoutes: AppRoute[] = [
  {
    path: '/company/printing',
    name: 'Agentes de impresión',
    element: PrintAgentsPage,
    roles: ['administrador'],
  },
]
