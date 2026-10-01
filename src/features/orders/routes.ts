import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const OrdersPage = lazy(() => import('./OrdersPage'))
const OrderDetailPage = lazy(() => import('./OrderDetailPage'))
const WorkshopPage = lazy(() => import('./WorkshopPage'))
const WorkshopBoardPage = lazy(() => import('./WorkshopBoardPage'))

export const ordersRoutes: AppRoute[] = [
  {
    path: '/workshop-board',
    name: 'Taller',
    element: WorkshopBoardPage,
    roles: ['administrador', 'operador', 'canteador'],
    workspace: 'taller',
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
    actionBar: true,
  },
  {
    // «Corte», not «Taller»: that is the place, and this is one order being cut in it.
    path: '/orders/:id/workshop',
    name: 'Corte',
    element: WorkshopPage,
    roles: ['administrador', 'vendedor', 'operador'],
    workspace: 'taller',
    immersive: true,
  },
]
