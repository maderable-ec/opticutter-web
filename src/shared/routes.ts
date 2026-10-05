import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { Role } from 'src/features/auth/types'
import { ROLE_ORDER } from 'src/features/auth/permissions'
import { analyticsRoutes } from 'src/features/analytics/routes'
import { homeRoutes } from 'src/features/home/routes'
import { clientsRoutes } from 'src/features/clients/routes'
import { inventoryRoutes } from 'src/features/inventory/routes'
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
import { HUBS } from './hubs'

// The places with a shell of their own (see `AppRoute.workspace`).
export type WorkspaceId = 'workshop'

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
  // one: its queue and the canvas an order is cut on, both under `/workshop`.
  workspace?: WorkspaceId
  // The page covers the whole viewport with a bar of its own (the cutting canvas), so the layout
  // puts no header under it: hidden behind the page, its controls still took the Tab key.
  immersive?: boolean
}

// Every screen a feature declares. Matched in order by the navigation (`routeAt`), so a static
// path goes before a dynamic one it would also match: `/preorders/new` (the optimizer) before
// `/preorders/:id`.
const screens: AppRoute[] = [
  ...homeRoutes,
  ...usersRoutes,
  ...branchesRoutes,
  ...printRoutes,
  ...analyticsRoutes,
  ...clientsRoutes,
  ...ordersRoutes,
  ...optimizerRoutes,
  ...preordersRoutes,
  ...productsRoutes,
  ...productFamiliesRoutes,
  ...servicesRoutes,
  ...inventoryRoutes,
  ...settingsRoutes,
  ...profileRoutes,
]

const HubIndexPage = lazy(() => import('./components/HubIndexPage'))

// Open to whoever may open one of its tabs; to everyone if any tab is.
const hubRoles = (tabs: readonly string[]): Role[] | undefined => {
  const routes = tabs.map((to) => screens.find((route) => route.path === to))
  if (routes.some((route) => !route?.roles)) return undefined
  return ROLE_ORDER.filter((role) => routes.some((route) => route?.roles?.includes(role)))
}

// A hub's own path (`/catalog`) is no screen: it opens the first tab the user may open. It is a
// route all the same, so the breadcrumb finds the hub by its path like any other step.
const hubRoutes: AppRoute[] = HUBS.map((hub) => ({
  path: hub.path,
  name: hub.name,
  element: HubIndexPage,
  roles: hubRoles(hub.tabs.map((tab) => tab.to)),
}))

export const routes: AppRoute[] = [...screens, ...hubRoutes]
