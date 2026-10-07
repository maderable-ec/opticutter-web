import { REPORT_PARAMS } from 'src/features/analytics/reportFilters'
import type { IconName } from 'src/shared/icons/registry'

// The hubs, as data: both the route registry (their index routes) and the navigation (menu, tabs,
// breadcrumb) read them, so they live apart from either and import neither.

export type HubId = 'catalog' | 'analytics' | 'company'

interface HubTabDef {
  // A route's path: the tab takes its name and its roles from the route, so a tab never shows to a
  // role the route would bounce.
  to: string
  // Where the route's name would crowd the rail («Servicios adicionales»).
  label?: string
}

/**
 * Screens that are one place in the menu and tabs under it. Each one alone was an entry used a few
 * times a month (the admin's menu had eighteen); together they are a single entry, and the tabs
 * move between them without going back to the menu. The hub is also the first segment of every
 * tab's path, so a URL says which part of the product it belongs to: `/catalog/low-stock` is the
 * catalog's. The hub's own path opens its first tab the user may open.
 */
export interface Hub {
  id: HubId
  path: string
  name: string
  icon: IconName
  tabs: HubTabDef[]
  // Query keys a tab hands on to the next. The four reports look through one window (period,
  // branch…), so moving between them keeps it; the catalog's lists each filter on their own keys.
  keepParams?: readonly string[]
}

export const HUBS: Hub[] = [
  {
    id: 'catalog',
    path: '/catalog',
    name: 'Catálogo',
    icon: 'catalog',
    // Stock bajo is what the admin reorders from: operational, not a look back, so it sits with
    // the catalog it is about rather than with the reports. Admin only, like its route.
    tabs: [
      { to: '/catalog/products' },
      { to: '/catalog/families' },
      { to: '/catalog/services', label: 'Servicios' },
      { to: '/catalog/low-stock' },
    ],
  },
  {
    id: 'analytics',
    path: '/analytics',
    name: 'Estadísticas',
    icon: 'stats',
    // The comparison first, then what it is made of: the shop's workday, each team, the process.
    tabs: [
      { to: '/analytics/summary' },
      { to: '/analytics/production' },
      { to: '/analytics/productivity' },
      { to: '/analytics/bottlenecks' },
      { to: '/analytics/attendance' },
    ],
    keepParams: REPORT_PARAMS,
  },
  {
    // «Empresa», not «Administración»: what the company is (its people, its branches, its printers,
    // its settings), and short enough for the menu's rail.
    id: 'company',
    path: '/company',
    name: 'Empresa',
    icon: 'admin',
    tabs: [
      { to: '/company/users' },
      { to: '/company/branches' },
      { to: '/company/printing', label: 'Impresión' },
      { to: '/company/settings' },
    ],
  },
]
