import React from 'react'

const ClientsPage = React.lazy(() => import('./ClientsPage'))

export const clientsRoutes = [{ path: '/clients', name: 'Clientes', element: ClientsPage }]
