import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const WidgetsPage = lazy(() => import('./WidgetsPage'))

export const widgetsRoutes: AppRoute[] = [
  { path: '/widgets', name: 'Widgets', element: WidgetsPage },
]
