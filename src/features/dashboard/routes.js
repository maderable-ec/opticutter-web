import React from 'react'

const DashboardPage = React.lazy(() => import('./DashboardPage'))

export const dashboardRoutes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: DashboardPage },
]
