import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const ReviewPage = lazy(() => import('./ReviewPage'))

export const reviewRoutes: AppRoute[] = [
  { path: '/review/:token', name: 'Revisión de cotización', element: ReviewPage },
]
