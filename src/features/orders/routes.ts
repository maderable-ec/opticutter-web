import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const OrdersPage = lazy(() => import('./OrdersPage'))
const OrderDetailPage = lazy(() => import('./OrderDetailPage'))
const WorkshopPage = lazy(() => import('./WorkshopPage'))
const WorkshopBoardPage = lazy(() => import('./WorkshopBoardPage'))

export const ordersRoutes: AppRoute[] = [
  {
    path: '/workshop-board',
    name: 'Tablero de taller',
    element: WorkshopBoardPage,
    roles: ['administrador', 'operador', 'canteador'],
  },
  {
    path: '/orders',
    name: 'Órdenes',
    element: OrdersPage,
    roles: ['administrador', 'vendedor'],
  },
  {
    path: '/orders/:id',
    name: 'Detalle de orden',
    element: OrderDetailPage,
    roles: ['administrador', 'vendedor'],
  },
  {
    path: '/orders/:id/workshop',
    name: 'Taller',
    element: WorkshopPage,
    roles: ['administrador', 'vendedor', 'operador'],
  },
]
