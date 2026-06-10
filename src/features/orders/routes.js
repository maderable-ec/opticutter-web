import React from 'react'

const OrdersPage = React.lazy(() => import('./OrdersPage'))
const OrderCreatePage = React.lazy(() => import('./OrderCreatePage'))
const OrderDetailPage = React.lazy(() => import('./OrderDetailPage'))

export const ordersRoutes = [
  { path: '/orders', name: 'Órdenes', element: OrdersPage },
  { path: '/orders/new', name: 'Nueva cotización', element: OrderCreatePage },
  { path: '/orders/:id', name: 'Detalle de orden', element: OrderDetailPage },
]
