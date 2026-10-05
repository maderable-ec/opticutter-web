import { describe, expect, it } from 'vitest'
import { CNavGroup, CNavItem } from '@coreui/react'

import type { Role } from 'src/features/auth/types'
import { REPORT_PARAMS } from 'src/features/analytics/reportFilters'
import {
  backFor,
  bottomNavFor,
  breadcrumbsFor,
  carryParams,
  entryCurrent,
  exitFor,
  hasMenu,
  hubFor,
  hubLanding,
  orderPathFor,
  originFrom,
  originOf,
  pageTitle,
  returnFor,
  sectionsForRoles,
  sheetHolds,
  sheetSectionsFor,
  workspaceFor,
} from './navigation'
import type { NavSection, Origin } from './navigation'

// Who sees which way around the app. A wrong role here does not error: an entry just shows up for
// someone the route then bounces, or a whole section goes missing.

const titles = (roles: Role[]) => sectionsForRoles(roles).map((s) => s.title ?? '(sin título)')
const names = (roles: Role[]) =>
  sectionsForRoles(roles).flatMap((s) => s.items.map((item) => item.name))

describe('the menu by role', () => {
  it('gives the admin every section, in the order the business runs', () => {
    expect(titles(['administrador'])).toEqual(['(sin título)', 'Ventas', 'Producción', 'Gestión'])
  })

  it('gives the admin nine entries: the daily work, the workshop and a hub per rare task', () => {
    // Eighteen before the hubs.
    expect(names(['administrador'])).toEqual([
      'Inicio',
      'Cotizar',
      'Cotizaciones',
      'Órdenes',
      'Clientes',
      'Taller',
      'Catálogo',
      'Estadísticas',
      'Empresa',
    ])
  })

  it('gives the seller what they sell and sell from, and nothing to administer', () => {
    // Inicio stands above the sections, with no title of its own.
    expect(titles(['vendedor'])).toEqual(['(sin título)', 'Ventas', 'Gestión'])
    expect(names(['vendedor'])).toEqual([
      'Inicio',
      'Cotizar',
      'Cotizaciones',
      'Órdenes',
      'Clientes',
      'Catálogo',
    ])
  })

  it('opens a hub on its first tab the role may open, and lights it on every one', () => {
    const hub = (roles: Role[], name: string) =>
      sectionsForRoles(roles)
        .flatMap((s) => s.items)
        .find((item) => item.name === name)
    expect(hub(['vendedor'], 'Catálogo')).toMatchObject({
      to: '/catalog/products',
      matches: ['/catalog/products', '/catalog/families', '/catalog/services'],
    })
    expect(hub(['administrador'], 'Catálogo')?.matches).toContain('/catalog/low-stock')
    expect(hub(['administrador'], 'Estadísticas')).toMatchObject({
      to: '/analytics/summary',
      matches: [
        '/analytics/summary',
        '/analytics/bottlenecks',
        '/analytics/productivity',
        '/analytics/attendance',
      ],
    })
  })

  it('leaves the shop floor a single destination, which is no menu at all', () => {
    for (const roles of [['operador'], ['canteador'], ['operador', 'canteador']] as Role[][]) {
      const sections = sectionsForRoles(roles)
      expect(names(roles), roles.join('+')).toEqual(['Taller'])
      expect(hasMenu(sections), roles.join('+')).toBe(false)
    }
    expect(hasMenu(sectionsForRoles(['vendedor']))).toBe(true)
  })

  it('filters a group’s children too, and drops a group left empty', () => {
    const sections: NavSection[] = [
      {
        title: 'Mixta',
        items: [
          {
            component: CNavGroup,
            name: 'Grupo',
            items: [
              { component: CNavItem, name: 'Para todos', to: '/a' },
              { component: CNavItem, name: 'Solo admin', to: '/b', roles: ['administrador'] },
            ],
          },
          {
            component: CNavGroup,
            name: 'Vacío',
            items: [
              { component: CNavItem, name: 'Solo admin', to: '/c', roles: ['administrador'] },
            ],
          },
        ],
      },
    ]
    const [section] = sectionsForRoles(['vendedor'], sections)
    expect(section?.items.map((item) => item.name)).toEqual(['Grupo'])
    expect(section?.items[0]?.items?.map((item) => item.name)).toEqual(['Para todos'])
  })
})

describe('the hubs', () => {
  const tabs = (path: string, roles: Role[]) => hubFor(path, roles)?.tabs.map((t) => t.name)

  it('find the hub a screen is a tab of, with the tabs the role may open', () => {
    expect(hubFor('/analytics/bottlenecks', ['administrador'])?.name).toBe('Estadísticas')
    expect(tabs('/analytics/bottlenecks', ['administrador'])).toEqual([
      'Resumen',
      'Cuellos de botella',
      'Productividad',
      'Asistencia',
    ])
    // Stock bajo is the admin's, like its route.
    expect(tabs('/catalog/products', ['vendedor'])).toEqual(['Productos', 'Familias', 'Servicios'])
    expect(tabs('/catalog/low-stock', ['administrador'])).toEqual([
      'Productos',
      'Familias',
      'Servicios',
      'Stock bajo',
    ])
    expect(tabs('/company/printing', ['administrador'])).toEqual([
      'Usuarios',
      'Sucursales',
      'Impresión',
      'Configuración',
    ])
  })

  it('open, from their own path, on the first tab the role may open', () => {
    expect(hubLanding('/catalog', ['vendedor'])).toBe('/catalog/products')
    expect(hubLanding('/analytics', ['administrador'])).toBe('/analytics/summary')
    expect(hubLanding('/company', ['vendedor'])).toBeNull()
    expect(hubLanding('/orders', ['administrador'])).toBeNull()
  })

  it('are no screen above their tabs: going up from a tab would land on a sibling', () => {
    expect(returnFor('/catalog/low-stock', ['administrador'])).toEqual({
      to: '/home',
      name: 'Inicio',
    })
  })

  it('are absent outside a hub and for a role with no tab in it', () => {
    expect(hubFor('/orders', ['administrador'])).toBeNull()
    expect(hubFor('/orders/41', ['administrador'])).toBeNull()
    expect(hubFor('/company/users', ['vendedor'])).toBeNull()
  })

  it('carry the reports’ window from one tab to the next, and nothing else', () => {
    const keep = hubFor('/analytics/summary', ['administrador'])?.keepParams
    expect(keep).toEqual(REPORT_PARAMS)
    expect(carryParams('?period=90d&q=x&branchId=2&offset=20', keep)).toBe('?period=90d&branchId=2')
    expect(carryParams('?from=2026-09-01&to=2026-09-15&role=operador', keep)).toBe(
      '?from=2026-09-01&to=2026-09-15&role=operador',
    )
    expect(carryParams('', keep)).toBe('')
    // The catalog's lists filter on keys of their own.
    expect(
      carryParams('?q=nogal&offset=20', hubFor('/catalog/products', ['vendedor'])?.keepParams),
    ).toBe('')
  })
})

describe('the phone’s bottom bar', () => {
  const labels = (path: string, roles: Role[]) => bottomNavFor(path, roles).map((i) => i.label)

  it('is the seller’s and the admin’s', () => {
    expect(labels('/preorders', ['vendedor'])).toEqual([
      'Inicio',
      'Cotizaciones',
      'Cotizar',
      'Órdenes',
      'Más',
    ])
    expect(labels('/clients', ['administrador'])).toHaveLength(5)
    expect(labels('/workshop', ['operador', 'canteador'])).toEqual([])
  })

  it('stays out of a workspace, which is left by its own «Salir»', () => {
    expect(labels('/workshop', ['administrador'])).toEqual([])
  })

  it('gives way inside a record and on a page with its own action bar', () => {
    expect(labels('/orders/41', ['vendedor'])).toEqual([])
    expect(labels('/preorders/123', ['vendedor'])).toEqual([])
    expect(labels('/workshop/orders/41', ['administrador'])).toEqual([])
    expect(labels('/preorders/new', ['vendedor'])).toEqual([])
  })
})

describe('the phone’s menu sheet', () => {
  const sheet = (path: string, roles: Role[]) =>
    sheetSectionsFor(sectionsForRoles(roles), bottomNavFor(path, roles))
  const entries = (path: string, roles: Role[]) =>
    sheet(path, roles).map((s) => [s.title ?? '(sin título)', s.items.map((item) => item.name)])

  it('holds under «Más» only what the bar lacks, by section', () => {
    expect(entries('/clients', ['administrador'])).toEqual([
      ['Ventas', ['Clientes']],
      ['Producción', ['Taller']],
      ['Gestión', ['Catálogo', 'Estadísticas', 'Empresa']],
    ])
    expect(entries('/preorders', ['vendedor'])).toEqual([
      ['Ventas', ['Clientes']],
      ['Gestión', ['Catálogo']],
    ])
  })

  it('is the whole menu where there is no bar: the optimizer’s only way around', () => {
    expect(sheet('/preorders/new', ['vendedor'])).toEqual(sectionsForRoles(['vendedor']))
    expect(sheet('/preorders/new', ['administrador']).flatMap((s) => s.items)).toHaveLength(9)
  })

  it('says what is in each hub, in the role’s tabs', () => {
    const catalog = (roles: Role[]) =>
      sheet('/clients', roles)
        .flatMap((s) => s.items)
        .find((item) => item.name === 'Catálogo')?.tabs
    expect(catalog(['vendedor'])).toEqual(['Productos', 'Familias', 'Servicios'])
    expect(catalog(['administrador'])).toEqual(['Productos', 'Familias', 'Servicios', 'Stock bajo'])
  })

  it('opens a group onto its entries: the sheet has no levels', () => {
    const sections: NavSection[] = [
      {
        title: 'Mixta',
        items: [
          {
            component: CNavGroup,
            name: 'Grupo',
            items: [
              { component: CNavItem, name: 'Uno', to: '/a' },
              { component: CNavItem, name: 'En la barra', to: '/orders' },
            ],
          },
          { component: CNavItem, name: 'Dos', to: '/b' },
        ],
      },
    ]
    const [section] = sheetSectionsFor(sections, bottomNavFor('/clients', ['vendedor']))
    expect(section?.items.map((item) => item.name)).toEqual(['Uno', 'Dos'])
  })

  it('lights «Más» on a screen it leads to, and not on one the bar has', () => {
    const holds = (path: string) => sheetHolds(sheet(path, ['administrador']), path)
    expect(holds('/clients')).toBe(true)
    expect(holds('/catalog/families')).toBe(true)
    expect(holds('/analytics/attendance')).toBe(true)
    expect(holds('/orders')).toBe(false)
    expect(holds('/profile')).toBe(false)
  })
})

describe('the entry that stands for the screen', () => {
  const hub = {
    to: '/analytics/summary',
    matches: ['/analytics/summary', '/analytics/productivity'],
  }

  it('is the page on its own screen and the place on the others it stands for', () => {
    expect(entryCurrent({ to: '/orders' }, '/orders')).toBe('page')
    expect(entryCurrent({ to: '/orders' }, '/orders/41')).toBe('true')
    expect(entryCurrent(hub, '/analytics/summary')).toBe('page')
    expect(entryCurrent(hub, '/analytics/productivity')).toBe('true')
  })

  it('is no entry’s elsewhere, a path that only starts the same included', () => {
    expect(entryCurrent({ to: '/orders' }, '/preorders')).toBeNull()
    expect(entryCurrent({ to: '/catalog/products' }, '/catalog/families')).toBeNull()
    expect(entryCurrent(hub, '/analytics/bottlenecks')).toBeNull()
    expect(entryCurrent({}, '/orders')).toBeNull()
  })
})

describe('the breadcrumb', () => {
  it('ends on the record, not on the list above it', () => {
    expect(breadcrumbsFor('/orders/41', ['vendedor'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/orders', name: 'Órdenes' },
      { to: '/orders/41', name: 'Detalle de orden' },
    ])
  })

  it('names the record by the code its page published, once it has', () => {
    const order = { path: '/orders/41', label: 'ORD-2026-0041' }
    expect(breadcrumbsFor('/orders/41', ['vendedor'], order).at(-1)).toEqual({
      to: '/orders/41',
      name: 'ORD-2026-0041',
    })
    expect(pageTitle(breadcrumbsFor('/orders/41', ['vendedor'], order))).toBe(
      'ORD-2026-0041 · Maderable',
    )
    // The cutting canvas is in the Taller, not under the order: its trail runs through the queue,
    // and the order's label is no name of the canvas.
    expect(breadcrumbsFor('/workshop/orders/41', ['administrador'], order)).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/workshop', name: 'Taller' },
      { to: '/workshop/orders/41', name: 'Corte' },
    ])
  })

  it('never names a record with a label set for another one, nor a screen that is not a record', () => {
    const other = { path: '/orders/42', label: 'ORD-2026-0042' }
    expect(breadcrumbsFor('/orders/41', ['vendedor'], other).at(-1)?.name).toBe('Detalle de orden')
    const list = { path: '/orders', label: 'ORD-2026-0041' }
    expect(breadcrumbsFor('/orders', ['vendedor'], list).at(-1)?.name).toBe('Órdenes')
  })

  it('names the browser tab after the screen', () => {
    expect(pageTitle(breadcrumbsFor('/orders/41', ['vendedor']))).toBe(
      'Detalle de orden · Maderable',
    )
    expect(pageTitle(breadcrumbsFor('/home', ['administrador']))).toBe('Inicio · Maderable')
    expect(pageTitle([])).toBe('Maderable')
  })

  it('does not lead with «Inicio» on the home screen itself', () => {
    expect(breadcrumbsFor('/home', ['administrador'])).toEqual([{ to: '/home', name: 'Inicio' }])
    expect(breadcrumbsFor('/workshop', ['operador'])).toEqual([{ to: '/workshop', name: 'Taller' }])
  })

  it('names the hub between home and a tab, by its path', () => {
    expect(breadcrumbsFor('/analytics/bottlenecks', ['administrador'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/analytics', name: 'Estadísticas' },
      { to: '/analytics/bottlenecks', name: 'Cuellos de botella' },
    ])
    expect(breadcrumbsFor('/analytics/summary', ['administrador'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/analytics', name: 'Estadísticas' },
      { to: '/analytics/summary', name: 'Resumen' },
    ])
    expect(breadcrumbsFor('/catalog/low-stock', ['administrador'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/catalog', name: 'Catálogo' },
      { to: '/catalog/low-stock', name: 'Stock bajo' },
    ])
    // A hub with any tab of theirs is a step the seller may take.
    expect(breadcrumbsFor('/catalog/products', ['vendedor'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/catalog', name: 'Catálogo' },
      { to: '/catalog/products', name: 'Productos' },
    ])
    // The tab stays the screen's name, for the browser tab and for «Volver».
    expect(pageTitle(breadcrumbsFor('/analytics/productivity', ['administrador']))).toBe(
      'Productividad · Maderable',
    )
  })

  it('puts a new quote under the quotes, not as one of them', () => {
    expect(breadcrumbsFor('/preorders/new', ['vendedor'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/preorders', name: 'Cotizaciones' },
      { to: '/preorders/new', name: 'Cotizar' },
    ])
  })

  it('starts at the shop floor’s home, which is the Taller itself', () => {
    expect(breadcrumbsFor('/workshop/orders/41', ['operador'])).toEqual([
      { to: '/workshop', name: 'Taller' },
      { to: '/workshop/orders/41', name: 'Corte' },
    ])
  })

  it('skips the steps the user cannot open', () => {
    expect(breadcrumbsFor('/workshop/orders/41', ['vendedor'])).toEqual([
      { to: '/home', name: 'Inicio' },
      { to: '/workshop/orders/41', name: 'Corte' },
    ])
  })
})

describe('the phone’s «‹» back', () => {
  it('goes from a record to the list above it', () => {
    expect(backFor('/orders/41', ['vendedor'])).toEqual({ to: '/orders', name: 'Órdenes' })
    expect(backFor('/preorders/123', ['administrador'])).toEqual({
      to: '/preorders',
      name: 'Cotizaciones',
    })
    // The canvas is the Taller's: with no way in known, up is the queue, for whoever may open it.
    expect(backFor('/workshop/orders/41', ['administrador'])).toEqual({
      to: '/workshop',
      name: 'Taller',
    })
  })

  it('sends the seller home from a canvas reached by its link alone', () => {
    // The queue above it is not theirs. Entered from the order's detail, the origin leads back there.
    expect(backFor('/workshop/orders/41', ['vendedor'])).toEqual({ to: '/home', name: 'Inicio' })
    const detail: Origin = { to: '/orders/41', name: 'ORD-2026-0041' }
    expect(backFor('/workshop/orders/41', ['vendedor'], detail)).toEqual(detail)
  })

  it('sends the operador home when nothing above the canvas is theirs', () => {
    expect(backFor('/workshop/orders/41', ['operador'])).toEqual({
      to: '/workshop',
      name: 'Taller',
    })
  })

  it('is absent outside a record', () => {
    expect(backFor('/orders', ['vendedor'])).toBeNull()
    expect(backFor('/preorders/new', ['vendedor'])).toBeNull()
  })
})

describe('the way back to where a screen was entered from', () => {
  const board: Origin = { to: '/workshop', name: 'Taller' }
  const home: Origin = { to: '/home', name: 'Inicio' }

  it('takes the admin from the canvas back to the board, not up to the order', () => {
    expect(backFor('/workshop/orders/41', ['administrador'], board)).toEqual(board)
  })

  it('takes a record back to the screen it was opened from, filters included', () => {
    const list: Origin = { to: '/orders?status=queued&branchId=2', name: 'Órdenes' }
    expect(backFor('/orders/41', ['vendedor'], home)).toEqual(home)
    expect(backFor('/orders/41', ['vendedor'], list)).toEqual(list)
    const quote: Origin = { to: '/preorders/9', name: 'Detalle de cotización', from: list }
    expect(backFor('/orders/41', ['administrador'], quote)).toEqual(quote)
  })

  it('falls back to the hierarchy when the origin is unknown, closed to the role or this screen', () => {
    expect(backFor('/orders/41', ['vendedor'], null)).toEqual({ to: '/orders', name: 'Órdenes' })
    expect(backFor('/orders/41', ['vendedor'], board)).toEqual({ to: '/orders', name: 'Órdenes' })
    expect(backFor('/orders/41', ['vendedor'], { to: '/orders/41', name: 'x' })).toEqual({
      to: '/orders',
      name: 'Órdenes',
    })
    expect(backFor('/orders/41', ['vendedor'], { to: '/no-existe', name: 'x' })).toEqual({
      to: '/orders',
      name: 'Órdenes',
    })
  })

  it('leaves the phone header its title outside a record, while «Volver» still has a way', () => {
    expect(backFor('/profile/change-password', ['vendedor'], home)).toBeNull()
    expect(returnFor('/profile/change-password', ['vendedor'], home)).toEqual(home)
    expect(returnFor('/profile/change-password', ['vendedor'])).toEqual({
      to: '/profile',
      name: 'Perfil',
    })
  })

  it('reads an origin only from a well-formed history state', () => {
    expect(originFrom({ from: board })).toEqual(board)
    expect(originFrom(undefined)).toBeNull()
    expect(originFrom(null)).toBeNull()
    expect(originFrom({ filterSheet: true })).toBeNull()
    expect(originFrom({ from: { to: 'https://evil.example', name: 'x' } })).toBeNull()
    expect(originFrom({ from: { to: '//evil.example', name: 'x' } })).toBeNull()
    expect(originFrom({ from: { to: '/orders' } })).toBeNull()
  })

  it('names the origin after the screen and keeps the one it came from', () => {
    expect(
      originOf({ pathname: '/orders', search: '?status=queued', state: { from: home } }, [
        'vendedor',
      ]),
    ).toEqual({ to: '/orders?status=queued', name: 'Órdenes', from: home })
    expect(originOf({ pathname: '/workshop', search: '' }, ['administrador'])).toEqual(board)
  })

  it('names a record left behind by its code, so its «Volver» says which one', () => {
    const quote = { path: '/preorders/9', label: 'PRE-000009' }
    expect(originOf({ pathname: '/preorders/9', search: '' }, ['vendedor'], quote)).toEqual({
      to: '/preorders/9',
      name: 'PRE-000009',
    })
  })

  it('keeps a bounded chain when two records link to each other', () => {
    let state: { from: Origin } | undefined
    for (let hop = 0; hop < 20; hop++) {
      const pathname = hop % 2 === 0 ? '/orders/41' : '/preorders/9'
      state = { from: originOf({ pathname, search: '', state }, ['administrador']) }
    }
    let depth = 0
    for (let o: Origin | undefined = state?.from; o; o = o.from) depth++
    expect(depth).toBe(6)
  })
})

describe('the Taller workspace', () => {
  const home: Origin = { to: '/home', name: 'Inicio' }
  const list: Origin = { to: '/orders?status=queued', name: 'Órdenes', from: home }

  it('holds the queue and the canvas, and the canvas brings its own bar', () => {
    expect(workspaceFor('/workshop')).toMatchObject({ id: 'workshop', immersive: false })
    expect(workspaceFor('/workshop/orders/41')).toMatchObject({ id: 'workshop', immersive: true })
    expect(workspaceFor('/orders/41')).toBeNull()
    expect(workspaceFor('/home')).toBeNull()
  })

  it('is entered from the menu by a link that carries the way out', () => {
    const entry = sectionsForRoles(['administrador'])
      .flatMap((s) => s.items)
      .find((item) => item.name === 'Taller')
    expect(entry).toMatchObject({ to: '/workshop', workspace: 'workshop' })
    const orders = sectionsForRoles(['administrador'])
      .flatMap((s) => s.items)
      .find((item) => item.name === 'Órdenes')
    expect(orders?.workspace).toBeUndefined()
  })

  it('lets the admin out to where they came from, filters and its own origin included', () => {
    expect(exitFor('/workshop', ['administrador'], list)).toEqual(list)
  })

  it('skips the origins inside the workspace on the way out', () => {
    // queue → canvas → back to the queue, which then says it was entered from the canvas
    const canvas: Origin = { to: '/workshop/orders/41', name: 'Corte', from: list }
    expect(exitFor('/workshop', ['administrador'], canvas)).toEqual(list)
  })

  it('lets the admin out to home when the way in is unknown or closed to them', () => {
    expect(exitFor('/workshop', ['administrador'])).toEqual(home)
    expect(exitFor('/workshop', ['administrador'], { to: '/no-existe', name: 'x' })).toEqual(home)
  })

  it('has no way out for the shop floor, whose whole app it is', () => {
    expect(exitFor('/workshop', ['operador'])).toBeNull()
    expect(exitFor('/workshop', ['canteador'], home)).toBeNull()
    expect(exitFor('/workshop', ['operador', 'canteador'])).toBeNull()
  })

  it('is no workspace’s exit outside one', () => {
    expect(exitFor('/orders/41', ['administrador'], home)).toBeNull()
  })
})

describe('the screen an order opens on', () => {
  it('is the detail for the office, the canvas for the operador and the board for the canteador', () => {
    expect(orderPathFor(41, ['administrador'])).toBe('/orders/41')
    expect(orderPathFor(41, ['vendedor'])).toBe('/orders/41')
    expect(orderPathFor(41, ['operador'])).toBe('/workshop/orders/41')
    expect(orderPathFor(41, ['operador', 'canteador'])).toBe('/workshop/orders/41')
    expect(orderPathFor(41, ['canteador'])).toBe('/workshop')
  })
})
