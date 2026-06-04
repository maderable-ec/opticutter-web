import React from 'react'

const WidgetsPage = React.lazy(() => import('./WidgetsPage'))

export const widgetsRoutes = [
  { path: '/widgets', name: 'Widgets', element: WidgetsPage },
]
