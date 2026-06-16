import type { ComponentType, LazyExoticComponent } from 'react'
import type { Role } from 'src/features/auth/types'
import { dashboardRoutes } from 'src/features/dashboard/routes'
import { widgetsRoutes } from 'src/features/widgets/routes'
import { clientsRoutes } from 'src/features/clients/routes'
import { ordersRoutes } from 'src/features/orders/routes'
import { preordersRoutes } from 'src/features/preorders/routes'
import { optimizerRoutes } from 'src/features/optimizer/routes'
import { productsRoutes } from 'src/features/products/routes'
import { settingsRoutes } from 'src/features/settings/routes'
import { usersRoutes } from 'src/features/users/routes'

export interface AppRoute {
  path: string
  name: string
  // Optional: breadcrumb-only entries (e.g. '/') have no element to render.
  element?: ComponentType<unknown> | LazyExoticComponent<ComponentType<unknown>>
  exact?: boolean
  roles?: Role[]
}

export const routes: AppRoute[] = [
  ...usersRoutes,
  ...dashboardRoutes,
  ...widgetsRoutes,
  ...clientsRoutes,
  ...ordersRoutes,
  ...preordersRoutes,
  ...optimizerRoutes,
  ...productsRoutes,
  ...settingsRoutes,
]
