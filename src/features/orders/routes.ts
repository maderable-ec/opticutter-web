import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const OrdersPage = lazy(() => import('./OrdersPage'))
const OrderCreatePage = lazy(() => import('./OrderCreatePage'))
const OrderDetailPage = lazy(() => import('./OrderDetailPage'))

export const ordersRoutes: AppRoute[] = [
  { path: '/orders', name: 'Órdenes', element: OrdersPage },
  { path: '/orders/new', name: 'Nueva cotización', element: OrderCreatePage },
  { path: '/orders/:id', name: 'Detalle de orden', element: OrderDetailPage },
]
