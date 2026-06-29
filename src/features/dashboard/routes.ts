import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const DashboardPage = lazy(() => import('./DashboardPage'))
const BottlenecksPage = lazy(() => import('./BottlenecksPage'))
const UsersProductivityPage = lazy(() => import('./UsersProductivityPage'))
const AttendancePage = lazy(() => import('./AttendancePage'))

export const dashboardRoutes: AppRoute[] = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: DashboardPage, roles: ['administrador'] },
  {
    path: '/analytics/bottlenecks',
    name: 'Cuellos de botella',
    element: BottlenecksPage,
    roles: ['administrador'],
  },
  {
    path: '/analytics/users',
    name: 'Productividad',
    element: UsersProductivityPage,
    roles: ['administrador'],
  },
  {
    path: '/analytics/attendance',
    name: 'Asistencia',
    element: AttendancePage,
    roles: ['administrador'],
  },
]
