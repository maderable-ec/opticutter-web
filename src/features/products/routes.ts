import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const ProductsPage = lazy(() => import('./ProductsPage'))

export const productsRoutes: AppRoute[] = [
  { path: '/products', name: 'Productos', element: ProductsPage },
]
