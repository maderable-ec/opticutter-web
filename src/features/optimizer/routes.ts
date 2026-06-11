import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const OptimizerPage = lazy(() => import('./OptimizerPage'))

export const optimizerRoutes: AppRoute[] = [
  { path: '/optimizer', name: 'Optimizador', element: OptimizerPage },
]
