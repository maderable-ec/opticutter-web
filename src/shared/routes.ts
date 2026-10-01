import type { ComponentType, LazyExoticComponent } from 'react'
import type { Role } from 'src/features/auth/types'
import { dashboardRoutes } from 'src/features/dashboard/routes'
import { homeRoutes } from 'src/features/home/routes'
import { clientsRoutes } from 'src/features/clients/routes'
import { ordersRoutes } from 'src/features/orders/routes'
import { preordersRoutes } from 'src/features/preorders/routes'
import { optimizerRoutes } from 'src/features/optimizer/routes'
import { printRoutes } from 'src/features/print/routes'
import { productFamiliesRoutes } from 'src/features/productFamilies/routes'
import { productsRoutes } from 'src/features/products/routes'
import { servicesRoutes } from 'src/features/services/routes'
import { settingsRoutes } from 'src/features/settings/routes'
import { usersRoutes } from 'src/features/users/routes'
import { branchesRoutes } from 'src/features/branches/routes'
import { profileRoutes } from 'src/features/profile/routes'

// The places with a shell of their own (see `AppRoute.workspace`).
export type WorkspaceId = 'taller'

export interface AppRoute {
  path: string
  name: string
  element: ComponentType<unknown> | LazyExoticComponent<ComponentType<unknown>>
  roles?: Role[]
  // Renders the route in a full-width container instead of the centered one. For pages whose value
  // is horizontal room (the optimizer's side-by-side panes), where the 1320px cap is the constraint.
  fluid?: boolean
  // The page pins an `ActionBar` to the bottom edge. On a phone that edge is the bottom nav's, so
  // the nav gives way to the page's own actions (see `bottomNavFor`).
  actionBar?: boolean
  // The screen belongs to a workspace (`WORKSPACES` in navigation.ts): a place of its own, with a
  // header that names it and no sidebar or bottom bar, left by an explicit «Salir». The Taller is
  // one: its queue and the canvas an order is cut on.
  workspace?: WorkspaceId
  // The page covers the whole viewport with a bar of its own (the cutting canvas), so the layout
  // puts no header under it: hidden behind the page, its controls still took the Tab key.
  immersive?: boolean
}

export const routes: AppRoute[] = [
  ...homeRoutes,
  ...usersRoutes,
  ...branchesRoutes,
  ...printRoutes,
  ...dashboardRoutes,
  ...clientsRoutes,
  ...ordersRoutes,
  ...preordersRoutes,
  ...optimizerRoutes,
  ...productsRoutes,
  ...productFamiliesRoutes,
  ...servicesRoutes,
  ...settingsRoutes,
  ...profileRoutes,
]
