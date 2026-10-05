import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const ProductFamiliesPage = lazy(() => import('./ProductFamiliesPage'))

export const productFamiliesRoutes: AppRoute[] = [
  {
    path: '/catalog/families',
    name: 'Familias',
    element: ProductFamiliesPage,
    roles: ['administrador', 'vendedor'],
  },
]
