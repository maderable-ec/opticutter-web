import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const SummaryPage = lazy(() => import('./SummaryPage'))
const ProductionPage = lazy(() => import('./ProductionPage'))
const BottlenecksPage = lazy(() => import('./BottlenecksPage'))
const UsersProductivityPage = lazy(() => import('./UsersProductivityPage'))
const AttendancePage = lazy(() => import('./AttendancePage'))

// The tabs of the Estadísticas hub (`HUBS`), under its path like the API's `/analytics/*`.
export const analyticsRoutes: AppRoute[] = [
  { path: '/analytics/summary', name: 'Resumen', element: SummaryPage, roles: ['administrador'] },
  {
    path: '/analytics/production',
    name: 'Producción',
    element: ProductionPage,
    roles: ['administrador'],
  },
  {
    path: '/analytics/productivity',
    name: 'Productividad',
    element: UsersProductivityPage,
    roles: ['administrador'],
  },
  {
    path: '/analytics/bottlenecks',
    name: 'Cuellos de botella',
    element: BottlenecksPage,
    roles: ['administrador'],
  },
  {
    path: '/analytics/attendance',
    name: 'Asistencia',
    element: AttendancePage,
    roles: ['administrador'],
  },
]
