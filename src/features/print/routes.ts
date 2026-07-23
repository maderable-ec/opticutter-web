import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const PrintAgentsPage = lazy(() => import('./PrintAgentsPage'))

export const printRoutes: AppRoute[] = [
  {
    path: '/print-agents',
    name: 'Agentes de impresión',
    element: PrintAgentsPage,
    roles: ['administrador'],
  },
]
