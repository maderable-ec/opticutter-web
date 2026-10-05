import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const SettingsPage = lazy(() => import('./SettingsPage'))

export const settingsRoutes: AppRoute[] = [
  {
    path: '/company/settings',
    name: 'Configuración',
    element: SettingsPage,
    roles: ['administrador'],
  },
]
