import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const OrdersPage = lazy(() => import('./OrdersPage'))
const OrderDetailPage = lazy(() => import('./OrderDetailPage'))
const WorkshopPage = lazy(() => import('./WorkshopPage'))
const BandingQueuePage = lazy(() => import('./BandingQueuePage'))

export const ordersRoutes: AppRoute[] = [
  {
    path: '/banding',
    name: 'Canteado',
    element: BandingQueuePage,
    roles: ['administrador', 'canteador'],
  },
  {
    path: '/orders',
    name: 'Órdenes',
    element: OrdersPage,
    roles: ['administrador', 'vendedor', 'operador'],
  },
  {
    path: '/orders/:id',
    name: 'Detalle de orden',
    element: OrderDetailPage,
    roles: ['administrador', 'vendedor', 'operador'],
  },
  {
    path: '/orders/:id/workshop',
    name: 'Taller',
    element: WorkshopPage,
    roles: ['administrador', 'vendedor', 'operador'],
  },
]
