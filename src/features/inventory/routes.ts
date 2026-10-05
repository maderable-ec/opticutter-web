import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const LowStockPage = lazy(() => import('./LowStockPage'))

// A tab of the Catálogo hub: what the admin reorders from (`GET /api/v1/inventory/low-stock`).
export const inventoryRoutes: AppRoute[] = [
  {
    path: '/catalog/low-stock',
    name: 'Stock bajo',
    element: LowStockPage,
    roles: ['administrador'],
  },
]
