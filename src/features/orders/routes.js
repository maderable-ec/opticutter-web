import React from 'react'

const OrdersPage = React.lazy(() => import('./OrdersPage'))
const OrderDetailPage = React.lazy(() => import('./OrderDetailPage'))

export const ordersRoutes = [
  { path: '/orders', name: 'Órdenes', element: OrdersPage },
  { path: '/orders/:id', name: 'Detalle de orden', element: OrderDetailPage },
]
