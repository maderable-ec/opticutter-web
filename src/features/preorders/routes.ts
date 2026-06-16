import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const PreOrdersPage = lazy(() => import('./PreOrdersPage'))
const PreOrderDetailPage = lazy(() => import('./PreOrderDetailPage'))

export const preordersRoutes: AppRoute[] = [
  { path: '/preorders', name: 'Cotizaciones', element: PreOrdersPage },
  { path: '/preorders/:id', name: 'Detalle de cotización', element: PreOrderDetailPage },
]
