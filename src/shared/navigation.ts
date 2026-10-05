import { matchPath } from 'react-router-dom'
import { CNavItem } from '@coreui/react'

import type { Role } from 'src/features/auth/types'
import { hasAnyRole, homePathForRoles } from 'src/features/auth/permissions'
import { clientsNav } from 'src/features/clients/nav'
import { homeNav } from 'src/features/home/nav'
import { optimizerNav } from 'src/features/optimizer/nav'
import { ordersNav, workshopNav } from 'src/features/orders/nav'
import { preordersNav } from 'src/features/preorders/nav'

import type { NavItem } from './components/AppSidebarNav'
import { HUBS } from './hubs'
import type { Hub } from './hubs'
import { routes } from './routes'
import type { AppRoute, WorkspaceId } from './routes'
import type { IconName } from 'src/shared/icons/registry'

// How the app is navigated: the menu, its hubs and workspaces, the phone's bottom bar, the
// breadcrumb and the way back. Pure functions of the path, the roles and the origin a screen was
// entered from, so the rules are tested without a browser; the shell reads them through
// `useShellNav`, `useBack` and `useFromHere`.

type Roles = readonly Role[] | undefined

const canOpen = (route: AppRoute, roles: Roles) => !route.roles || hasAnyRole(roles, route.roles)

// `matchPath` is exact by default, so `/orders` and `/orders/:id` never shadow each other. A dynamic
// segment does take any word, so the registry lists a static path before the dynamic one it would
// also match (`/preorders/new` before `/preorders/:id`).
const routeAt = (pathname: string): AppRoute | undefined =>
  routes.find((route) => matchPath(route.path, pathname))

export interface HubTab {
  to: string
  name: string
}

/** A hub as these roles see it: only the tabs whose route they may open, in order. */
export interface HubView extends Omit<Hub, 'tabs'> {
  tabs: HubTab[]
}

const hubTabs = (hub: Hub, roles: Roles): HubTab[] =>
  hub.tabs.flatMap((tab) => {
    const route = routeAt(tab.to)
    return route && canOpen(route, roles) ? [{ to: tab.to, name: tab.label ?? route.name }] : []
  })

/**
 * Where a hub's own path (`/catalog`) leads these roles: its first tab they may open, or null when
 * the path is no hub's or none of its tabs is theirs.
 */
export const hubLanding = (pathname: string, roles: Roles): string | null => {
  const hub = HUBS.find((h) => h.path === pathname)
  return (hub && hubTabs(hub, roles)[0]?.to) ?? null
}

const isHubPath = (pathname: string) => HUBS.some((hub) => hub.path === pathname)

/**
 * The hub this screen is a tab of, with the tabs these roles may open; null outside a hub, or when
 * none of its tabs is theirs. A tab is its route alone: a record under it would not be in the hub.
 */
export const hubFor = (pathname: string, roles: Roles): HubView | null => {
  const hub = HUBS.find((h) => h.tabs.some((tab) => matchPath(tab.to, pathname)))
  if (!hub) return null
  const tabs = hubTabs(hub, roles)
  return tabs.length > 0 ? { ...hub, tabs } : null
}

/**
 * The query a tab carries to the next one: only the hub's own keys, in the order they appear. A
 * search typed in one list means nothing to the next, but a report's period means the same in all
 * four.
 */
export const carryParams = (search: string, keys: readonly string[] = []): string => {
  const from = new URLSearchParams(search)
  const kept = new URLSearchParams()
  from.forEach((value, key) => {
    if (keys.includes(key)) kept.append(key, value)
  })
  const query = kept.toString()
  return query ? `?${query}` : ''
}

/**
 * A place with a shell of its own: a header that names it, no sidebar, no bottom bar and an explicit
 * way out. The Taller is one, the way a till is: the whole app of the shop floor, and a place the
 * admin goes into to work the queue and comes back out of. The screens in it say so on their route
 * (`AppRoute.workspace`), so the queue and the canvas share one frame instead of the office's shell
 * changing to the canvas's halfway through the job.
 */
export interface Workspace {
  id: WorkspaceId
  name: string
  // Its way out, for the roles that have somewhere else to be.
  exitLabel: string
}

export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  workshop: { id: 'workshop', name: 'Taller', exitLabel: 'Salir del taller' },
}

export interface WorkspaceView extends Workspace {
  // The page brings its own bar and the layout adds none (`AppRoute.immersive`).
  immersive: boolean
}

/** The workspace this screen is in, or null in the office's shell. */
export const workspaceFor = (pathname: string): WorkspaceView | null => {
  const route = routeAt(pathname)
  if (!route?.workspace) return null
  return { ...WORKSPACES[route.workspace], immersive: !!route.immersive }
}

export interface NavSection {
  // Omitted for entries that stand above every section.
  title?: string
  items: NavItem[]
}

const hubEntry = (hub: Hub): NavItem => ({
  component: CNavItem,
  name: hub.name,
  icon: hub.icon,
  hub: hub.id,
})

// The menu in the order the business runs: sell, produce, then manage what is sold, look back at
// how it went and run the place. The daily work is one tap away; the rest is a hub each.
export const NAV_SECTIONS: NavSection[] = [
  { items: homeNav },
  { title: 'Ventas', items: [...optimizerNav, ...preordersNav, ...ordersNav, ...clientsNav] },
  { title: 'Producción', items: workshopNav },
  { title: 'Gestión', items: HUBS.map(hubEntry) },
]

// A group's children are filtered too, and a group left with none goes with them: the old sidebar
// only filtered the top level, so an admin-only child inside a shared group would have shown.
// A hub's entry opens its first tab these roles may open and stays lit on all of them; with no
// tab of theirs it goes. An entry into a workspace says so, because unlike a move between screens
// it carries the way back out (`exitFor`).
const visibleItems = (items: NavItem[], roles: Roles): NavItem[] =>
  items.flatMap((item) => {
    if (item.roles && !hasAnyRole(roles, item.roles)) return []
    if (item.hub) {
      const hub = HUBS.find((h) => h.id === item.hub)
      const tabs = hub ? hubTabs(hub, roles) : []
      const first = tabs[0]
      return first
        ? [
            {
              ...item,
              to: first.to,
              matches: tabs.map((tab) => tab.to),
              tabs: tabs.map((tab) => tab.name),
            },
          ]
        : []
    }
    if (!item.items) {
      const workspace = item.to ? routeAt(item.to)?.workspace : undefined
      return [workspace ? { ...item, workspace } : item]
    }
    const children = visibleItems(item.items, roles)
    return children.length > 0 ? [{ ...item, items: children }] : []
  })

/** The menu a set of roles sees. A section none of its entries survive goes, title and all. */
export const sectionsForRoles = (roles: Roles, sections = NAV_SECTIONS): NavSection[] =>
  sections.flatMap((section) => {
    const items = visibleItems(section.items, roles)
    return items.length > 0 ? [{ ...section, items }] : []
  })

/**
 * Whether a menu entry stands for this screen, as the value of its `aria-current`: `'page'` on the
 * very screen it opens, `'true'` on another one it stands for (a hub's other tabs, a screen under
 * the entry's path), null anywhere else.
 */
export const entryCurrent = (
  item: Pick<NavItem, 'to' | 'matches'>,
  pathname: string,
): 'page' | 'true' | null => {
  if (!item.to) return null
  if (matchPath(item.to, pathname)) return 'page'
  const paths = item.matches ?? [item.to]
  return paths.some((path) => matchPath({ path, end: !!item.matches }, pathname)) ? 'true' : null
}

const countLinks = (items: NavItem[]): number =>
  items.reduce((n, item) => n + (item.items ? countLinks(item.items) : 1), 0)

/**
 * A menu with a single destination is no menu: it can only take the user where they already are.
 * The operador and the canteador have the workshop board and nothing else, so they get neither the
 * sidebar nor the button that opens it.
 */
export const hasMenu = (sections: NavSection[]): boolean =>
  sections.reduce((n, section) => n + countLinks(section.items), 0) > 1

export interface BottomNavItem {
  label: string
  icon: IconName
  // Absent on «Más», which opens the menu's sheet instead of going somewhere.
  to?: string
  roles: readonly Role[]
  // The one action among the destinations: the raised disc in the middle of the bar, with no label.
  primary?: boolean
}

// The phone's bar: home, the three places a seller goes all day, and the rest of the menu behind
// «Más», which opens it in a sheet (`sheetSectionsFor`).
export const BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Inicio', icon: 'home', to: '/home', roles: ['administrador', 'vendedor'] },
  { label: 'Cotizaciones', icon: 'quotes', to: '/preorders', roles: ['administrador', 'vendedor'] },
  {
    label: 'Cotizar',
    icon: 'newQuote',
    to: '/preorders/new',
    roles: ['administrador', 'vendedor'],
    primary: true,
  },
  { label: 'Órdenes', icon: 'orders', to: '/orders', roles: ['administrador', 'vendedor'] },
  { label: 'Más', icon: 'more', roles: ['administrador', 'vendedor'] },
]

const isRecord = (route: AppRoute) => route.path.includes(':')

/**
 * The bottom bar's entries on this screen, or none. It belongs to the screens you move BETWEEN: inside
 * a record the way out is «‹» in the header, a page with its own `ActionBar` needs the edge, and a
 * workspace is left by its own «Salir».
 */
export const bottomNavFor = (pathname: string, roles: Roles): BottomNavItem[] => {
  const route = routeAt(pathname)
  if (route && (isRecord(route) || route.actionBar || route.workspace)) return []
  return BOTTOM_NAV.filter((item) => hasAnyRole(roles, item.roles))
}

/**
 * A group's entries in its place: neither the sidebar nor the phone's sheet has levels to open.
 */
export const navLeaves = (items: NavItem[]): NavItem[] =>
  items.flatMap((item) => (item.items ? navLeaves(item.items) : [item]))

/**
 * The phone's menu (`NavSheet`): the menu less what the bottom bar already holds. «Más» opens it
 * right above the bar, where Inicio or Órdenes a second time would only bury the five entries the
 * bar lacks. With no bar on screen (the optimizer) nothing is left out: the sheet is the only way
 * around. A group is its children: the sheet has no levels to open.
 */
export const sheetSectionsFor = (sections: NavSection[], bar: BottomNavItem[]): NavSection[] => {
  const inBar = new Set(bar.flatMap((item) => (item.to ? [item.to] : [])))
  return sections.flatMap((section) => {
    const items = navLeaves(section.items).filter((item) => !item.to || !inBar.has(item.to))
    return items.length > 0 ? [{ ...section, items }] : []
  })
}

/**
 * Whether this screen is one the sheet leads to. «Más» then lights the way a destination of the bar
 * does: on Clientes or in the catalog, nothing in the bar said where the user was.
 */
export const sheetHolds = (sections: NavSection[], pathname: string): boolean =>
  sections.some((section) => section.items.some((item) => entryCurrent(item, pathname)))

export interface Crumb {
  to: string
  name: string
}

/**
 * A record's own name, published by its page once the record has loaded (`useRecordLabel`): the
 * order's code where the route can only say «Detalle de orden». Only a code, never a client's name:
 * it reaches the browser tab's title, the origin a link leaves behind («Volver a ORD-2026-0041») and
 * the page title analytics records.
 */
export interface RecordLabel {
  // The record's path, so a label can never name another record than the one it was set for.
  path: string
  label: string
}

/**
 * The trail to this screen, a crumb per path prefix that is a route the user may open. A record
 * gets a crumb of its own, so the trail ends where the user is instead of on the list above it: its
 * code once the page has published it (`record`), «Detalle de orden» until then. A hub's tab
 * follows the hub's crumb («Estadísticas / Cuellos de botella»), because the hub is its path's first
 * segment and a route of its own that opens its first tab. «Inicio» leads unless the trail already
 * starts at home.
 */
export const breadcrumbsFor = (
  pathname: string,
  roles: Roles,
  record?: RecordLabel | null,
): Crumb[] => {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.flatMap((_, i) => {
    const to = `/${segments.slice(0, i + 1).join('/')}`
    const route = routeAt(to)
    if (!route || !canOpen(route, roles)) return []
    return [{ to, name: isRecord(route) && record?.path === to ? record.label : route.name }]
  })
  const home = homePathForRoles(roles)
  return crumbs[0]?.to === home ? crumbs : [{ to: home, name: 'Inicio' }, ...crumbs]
}

/**
 * The browser tab's title: the screen, then the app. It was «Maderable» on every screen, so two
 * tabs could not be told apart and a screen reader announced the same name on every navigation.
 */
export const pageTitle = (crumbs: Crumb[]): string => {
  const screen = crumbs[crumbs.length - 1]?.name
  return screen ? `${screen} · Maderable` : 'Maderable'
}

/**
 * Where a screen was entered from: the way «Volver» takes when it can. It travels in the history
 * entry (`location.state.from`), not in the URL, so a shared link stays clean, and the browser keeps
 * it across a reload and through back/forward. Each origin carries the one it was entered from in
 * turn, so a chain — the workshop board, an order's canvas, its detail — unwinds a step at a time.
 */
export interface Origin {
  // Path and query of the screen left: a filtered list comes back filtered.
  to: string
  name: string
  from?: Origin
}

/** A way back, and the origin to restore on arrival so that screen's own «Volver» still works. */
export interface Back extends Crumb {
  from?: Origin
}

// How many origins a chain keeps. A loop between two records (an order, its quote, the order again)
// nests one per hop; past this the oldest steps fall back to the hierarchy.
const MAX_ORIGIN_DEPTH = 6

const isOrigin = (value: unknown): value is Origin =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Origin).to === 'string' &&
  // An in-app path only: never a full or protocol-relative URL.
  (value as Origin).to.startsWith('/') &&
  !(value as Origin).to.startsWith('//') &&
  typeof (value as Origin).name === 'string'

/** The origin a history entry carries, or null when it was reached by its URL alone. */
export const originFrom = (state: unknown): Origin | null => {
  const from = (state as { from?: unknown } | null | undefined)?.from
  return isOrigin(from) ? from : null
}

const trim = (origin: Origin, depth = 1): Origin => {
  const { from, ...rest } = origin
  if (!from || !isOrigin(from) || depth >= MAX_ORIGIN_DEPTH) return rest
  return { ...rest, from: trim(from, depth + 1) }
}

/**
 * The origin a link leaves behind: this screen, under the name its trail ends on (a record's code
 * when its page has published one), carrying the origin this screen was itself entered from.
 */
export const originOf = (
  location: { pathname: string; search?: string; state?: unknown },
  roles: Roles,
  record?: RecordLabel | null,
): Origin => {
  const crumbs = breadcrumbsFor(location.pathname, roles, record)
  const from = originFrom(location.state)
  return trim({
    to: `${location.pathname}${location.search ?? ''}`,
    name: crumbs[crumbs.length - 1]?.name ?? 'Inicio',
    ...(from && { from }),
  })
}

const pathOf = (to: string) => to.split(/[?#]/)[0] ?? to

/**
 * The nearest screen above this one the user may open, or their home when there is none (the
 * seller's cutting canvas sits under a queue that is not theirs). A hub's path is no screen above
 * its tabs: it opens the first one, so going «up» from a tab would land on a sibling.
 */
export const parentFor = (pathname: string, roles: Roles): Crumb => {
  const segments = pathname.split('/').filter(Boolean)
  for (let n = segments.length - 1; n > 0; n--) {
    const to = `/${segments.slice(0, n).join('/')}`
    const parent = routeAt(to)
    if (parent && canOpen(parent, roles) && !isHubPath(to)) return { to, name: parent.name }
  }
  const home = homePathForRoles(roles)
  return { to: home, name: routeAt(home)?.name ?? 'Inicio' }
}

/**
 * Where «Volver» goes from any screen: the screen it was entered from, when that is known, still
 * open to this user and not this very screen; otherwise the one above it in the hierarchy. The
 * breadcrumb stays structural (where am I); this is the way back (where did I come from).
 */
export const returnFor = (pathname: string, roles: Roles, origin?: Origin | null): Back => {
  if (origin && pathOf(origin.to) !== pathname) {
    const route = routeAt(pathOf(origin.to))
    if (route && canOpen(route, roles)) return origin
  }
  return parentFor(pathname, roles)
}

/**
 * Where the phone header's «‹» goes from a record (see `returnFor`). Null outside a record, where
 * the header keeps its title and the bottom bar is the way around.
 */
export const backFor = (pathname: string, roles: Roles, origin?: Origin | null): Back | null => {
  const route = routeAt(pathname)
  if (!route || !isRecord(route)) return null
  return returnFor(pathname, roles, origin)
}

/**
 * The way out of a workspace: the nearest screen it was entered from that lies outside it and is
 * still open to these roles, or else their home. The origins inside the workspace are skipped, so
 * the queue → canvas → queue round trip still leaves to where the admin was before the Taller.
 * Null for a role whose whole app is the workspace (the operador's home is the queue): there is
 * nowhere to leave to.
 */
export const exitFor = (pathname: string, roles: Roles, origin?: Origin | null): Back | null => {
  const here = routeAt(pathname)?.workspace
  if (!here) return null
  const outside = (to: string) => {
    const route = routeAt(pathOf(to))
    return !!route && route.workspace !== here && canOpen(route, roles)
  }
  for (let o: unknown = origin; isOrigin(o); o = o.from) {
    if (outside(o.to)) return o
  }
  const home = homePathForRoles(roles)
  return outside(home) ? { to: home, name: routeAt(home)?.name ?? 'Inicio' } : null
}

/**
 * The screen an order opens on for these roles: the office reads its detail, the operador cuts it
 * on the canvas, and the canteador — who has neither — works it from the board. A link that ignored
 * the role sent the shop floor to a route that bounced them home without a word.
 */
export const orderPathFor = (orderId: number | string, roles: Roles): string => {
  const candidates = [`/orders/${orderId}`, `/workshop/orders/${orderId}`]
  const open = candidates.find((path) => {
    const route = routeAt(path)
    return route && canOpen(route, roles)
  })
  return open ?? homePathForRoles(roles)
}
