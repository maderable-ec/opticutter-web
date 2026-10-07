import type { MockApi } from './fixtures/api'
import {
  branch,
  client,
  cuttingPlan,
  lowStockReport,
  minutesAgo,
  order,
  preOrder,
  preOrderSummary,
  stockCheck,
  workshopQueueItem,
} from './fixtures/data'
import { stubHome, stubOptimizer, stubReports } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// Getting around: the menu each role sees, its hubs, the breadcrumb, and on a phone (@movil) the
// bottom nav, the menu's sheet and the header's «‹». The role rules themselves are unit-tested in src/shared/navigation.test.ts;
// these check that the shell wires them.

const stubLists = (api: MockApi) => {
  api.list('/branches/', [branch()])
  api.list('/clients/', [client()])
  api.list('/orders/', [order()], 1)
  api.list('/preorders/', [preOrderSummary()], 1)
}

const stubOrder = (api: MockApi) => {
  api.get('/orders/41', order())
  api.get('/orders/41/cutting-plan', cuttingPlan())
  api.get('/orders/41/attachments', [])
  api.post('/inventory/stock-check', stockCheck())
}

const stubQuote = (api: MockApi) => {
  stubOptimizer(api)
  api.get('/preorders/123', preOrder())
  api.post('/inventory/stock-check', stockCheck())
  api.get('/preorders/123/review-link', {
    status: 'active',
    createdAt: minutesAgo(60),
    expiresAt: minutesAgo(-60 * 24 * 5),
    usedAt: null,
  })
}

// An order the shop is cutting: its card offers «Abrir corte».
const cuttingNow = workshopQueueItem({
  orderId: 41,
  orderCode: 'ORD-000041',
  status: 'in_process',
  activities: [
    { type: 'cutting', status: 'in_progress', readyAt: minutesAgo(45) },
    { type: 'banding', status: 'pending', readyAt: null },
  ],
})

const bottomNav = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Navegación rápida' })

// The paths before the URLs said which part of the product a screen is in (src/shared/legacyRoutes.ts
// has the whole table): a bookmark or a link pasted in a chat still lands, query and record included.
test('una dirección vieja lleva a donde vive hoy su pantalla', async ({ page, api, loginAs }) => {
  await loginAs(['administrador'])
  stubReports(api)
  api.get('/inventory/low-stock', lowStockReport())
  api.get('/orders/41/cutting-plan', cuttingPlan())

  await page.goto('/dashboard?period=90d&branchId=2')
  await expect(page).toHaveURL(/\/analytics\/summary\?period=90d&branchId=2$/)
  await page.goto('/analytics/users')
  await expect(page).toHaveURL(/\/analytics\/productivity$/)
  await expect(page.locator('.header-breadcrumb')).toContainText('Productividad')
  await page.goto('/analytics/low-stock')
  await expect(page).toHaveURL(/\/catalog\/low-stock$/)
  await expect(page.locator('.header-breadcrumb')).toContainText('Catálogo')
  await page.goto('/orders/41/workshop')
  await expect(page).toHaveURL(/\/workshop\/orders\/41$/)
  await expect(page.getByRole('img', { name: /^Tablero 1:/ })).toBeVisible()
})

test('el menú del vendedor son sus dos secciones, sin nada que administrar', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['vendedor'], { user: { branchId: 1 } })
  stubLists(api)

  await page.goto('/orders')
  await expect(page.locator('.side-nav__title')).toHaveText(['Ventas', 'Gestión'])
  // «Cotizar» is the button on top, not a row.
  await expect(page.locator('.side-nav__create')).toHaveAccessibleName('Cotizar')
  await expect(page.locator('.side-nav__link')).toHaveText([
    'Inicio',
    'Cotizaciones',
    'Órdenes',
    'Clientes',
    'Catálogo',
  ])
})

// From `md` up the menu is always on screen, and its width decides its form: a rail of icons, each
// over its name, up to `xl`; the full menu from there. Nothing unfolds on hover, nothing to pin.
test.describe('el menú desde md', () => {
  const menu = (page: import('@playwright/test').Page) =>
    page.getByRole('navigation', { name: 'Menú principal' })
  const box = async (locator: import('@playwright/test').Locator) => {
    const found = await locator.boundingBox()
    if (!found) throw new Error('sin caja: el elemento no se ve')
    return found
  }

  test('en la tablet es un riel: cada ícono con su nombre debajo, sin títulos', async ({
    page,
    api,
    loginAs,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await loginAs(['administrador'])
    stubLists(api)

    await page.goto('/clients')
    const links = menu(page).locator('.side-nav__link')
    await expect(links).toHaveCount(8)
    for (const link of await links.all()) {
      await expect(link.locator('.side-nav__label')).toBeVisible()
    }
    const entry = menu(page).getByRole('link', { name: 'Clientes' })
    await expect(entry).toHaveAttribute('aria-current', 'page')
    const icon = await box(entry.locator('svg'))
    const label = await box(entry.locator('.side-nav__label'))
    expect(label.y).toBeGreaterThanOrEqual(icon.y + icon.height)

    // No room for the titles, but every section is still a list by its name.
    await expect(menu(page).locator('.side-nav__title').first()).toBeHidden()
    await expect(menu(page).getByRole('list', { name: 'Ventas' })).toBeVisible()

    // «Cotizar» on top, its icon alone; and no arrow to narrow a rail that is already narrow.
    const create = menu(page).getByRole('link', { name: 'Cotizar' })
    await expect(create).toBeVisible()
    await expect(create).toHaveText('', { useInnerText: true })
    await expect(menu(page).getByRole('button', { name: 'Contraer el menú' })).toBeHidden()

    // The page keeps the rail's width free, and the header has no menu button to open it.
    const rail = await box(menu(page))
    expect(rail.width).toBe(84)
    expect((await box(page.getByRole('main'))).x).toBeGreaterThanOrEqual(rail.width)
    await expect(page.getByRole('button', { name: 'Menú', exact: true })).toHaveCount(0)
  })

  test('desde xl es el menú completo: ícono y nombre en fila, bajo los títulos', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)

    await page.goto('/clients')
    await expect(menu(page).locator('.side-nav__title')).toHaveText([
      'Ventas',
      'Producción',
      'Gestión',
    ])
    await expect(menu(page).locator('.side-nav__title').first()).toBeVisible()
    const entry = menu(page).getByRole('link', { name: 'Clientes' })
    const icon = await box(entry.locator('svg'))
    const label = await box(entry.locator('.side-nav__label'))
    expect(label.x).toBeGreaterThan(icon.x + icon.width)
    expect(label.y).toBeLessThan(icon.y + icon.height)

    await expect(menu(page).getByRole('link', { name: 'Cotizar' })).toHaveText('Cotizar', {
      useInnerText: true,
    })
    expect((await box(menu(page))).width).toBe(256)
  })

  test('desde xl la flecha del pie lo angosta al riel, y el navegador lo recuerda', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)

    await page.goto('/clients')
    await menu(page).getByRole('button', { name: 'Contraer el menú' }).click()
    expect((await box(menu(page))).width).toBe(84)
    expect((await box(page.getByRole('main'))).x).toBe(84)
    await expect(menu(page).locator('.side-nav__title').first()).toBeHidden()
    await expect(menu(page).getByRole('link', { name: 'Cotizar' })).toHaveText('', {
      useInnerText: true,
    })
    const entry = menu(page).getByRole('link', { name: 'Clientes' })
    const icon = await box(entry.locator('svg'))
    expect((await box(entry.locator('.side-nav__label'))).y).toBeGreaterThanOrEqual(
      icon.y + icon.height,
    )

    await page.reload()
    const widen = menu(page).getByRole('button', { name: 'Expandir el menú' })
    await expect(widen).toBeVisible()
    expect((await box(menu(page))).width).toBe(84)
    await widen.click()
    expect((await box(menu(page))).width).toBe(256)
    expect((await box(page.getByRole('main'))).x).toBe(256)
  })
})

test(
  'el operador no tiene menú ni salida: el Taller es toda su app',
  { tag: '@taller' },
  async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/workshop-queue', [])

    await page.goto('/workshop')
    await expect(page.getByText('No hay órdenes en el taller.')).toBeVisible()
    await expect(page.getByRole('banner')).toContainText('Taller')
    await expect(page.locator('.side-nav')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Menú', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Salir/ })).toHaveCount(0)
    await expect(bottomNav(page)).toHaveCount(0)
  },
)

test('la miga vuelve a la lista con sus filtros y sin recargar la app', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubLists(api)
  stubOrder(api)

  await page.goto('/orders?q=ORD-0000')
  await page.locator('.list-table').getByText('ORD-000041').click()
  await expect(page).toHaveURL(/\/orders\/41$/)
  // A full page load would wipe this; a router link keeps it.
  await page.evaluate(() => Object.assign(window, { e2eSameDocument: true }))

  // The record's crumb says which order this is, and so does the browser tab.
  const trail = page.locator('.header-breadcrumb')
  await expect(trail.locator('.breadcrumb-item.active')).toHaveText('ORD-000041')
  await expect(page).toHaveTitle('ORD-000041 · Maderable')
  await trail.getByRole('link', { name: 'Órdenes' }).click()

  await expect(page).toHaveURL(/\/orders\?q=ORD-0000$/)
  expect(await page.evaluate(() => 'e2eSameDocument' in window)).toBe(true)
})

test('el teclado salta el menú y la pestaña dice en qué pantalla está', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['administrador'])
  stubLists(api)

  await page.goto('/orders')
  await expect(page).toHaveTitle('Órdenes · Maderable')
  await expect(page.getByRole('heading', { level: 1, name: 'Órdenes' })).toBeAttached()

  // The first Tab lands on the skip link, which shows itself; Enter hands the focus to the content,
  // so the next Tab is inside the page and not on the seventeenth menu entry.
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Saltar al contenido' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await expect(page).toHaveURL(/\/orders$/)
})

test.describe('en el celular', { tag: '@movil' }, () => {
  const sheet = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog', { name: 'Menú' })

  test('el vendedor se mueve con la barra inferior y abre el resto con «Más»', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubLists(api)

    await page.goto('/orders')
    const bar = bottomNav(page)
    await expect(bar.getByRole('link', { name: 'Órdenes' })).toHaveAttribute('aria-current', 'page')
    // «Más» already opens the menu, so the header gives its corner to the title.
    await expect(page.getByRole('button', { name: 'Menú', exact: true })).toBeHidden()

    await bar.getByRole('link', { name: 'Cotizaciones' }).click()
    await expect(page).toHaveURL(/\/preorders$/)

    // A sheet over the bar with only what the bar lacks; the sidebar is not the phone's.
    const more = bar.getByRole('button', { name: 'Más' })
    await more.click()
    await expect(sheet(page)).toBeVisible()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(sheet(page).getByRole('heading')).toHaveText(['Menú', 'Ventas', 'Gestión'])
    await expect(sheet(page).getByRole('link')).toHaveText([
      'Clientes',
      'CatálogoProductos · Familias · Servicios',
    ])
    await expect(page.locator('.side-nav')).toBeHidden()

    await sheet(page).getByRole('link', { name: 'Clientes' }).click()
    await expect(page).toHaveURL(/\/clients$/)
    await expect(sheet(page)).toBeHidden()
    // Nothing in the bar is Clientes: «Más», where it lives, says where the seller is.
    await expect(more).toHaveAttribute('aria-current', 'true')
    await expect(more).toHaveClass(/active/)
    await expect(bar.getByRole('link', { name: 'Órdenes' })).not.toHaveAttribute('aria-current')
  })

  test('«Más» lleva al admin al Taller, y «Salir» lo devuelve a donde lo abrió', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)
    api.get('/orders/workshop-queue', [cuttingNow])

    await page.goto('/clients')
    await bottomNav(page).getByRole('button', { name: 'Más' }).click()
    await expect(sheet(page).getByRole('heading')).toHaveText([
      'Menú',
      'Ventas',
      'Producción',
      'Gestión',
    ])
    await expect(sheet(page).getByRole('link', { name: 'Clientes' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await sheet(page).getByRole('link', { name: 'Taller' }).click()
    await expect(page).toHaveURL(/\/workshop$/)
    await expect(page.locator('.workshop-card')).toHaveCount(1)

    await page.getByRole('button', { name: 'Salir del taller y volver a Clientes' }).click()
    await expect(page).toHaveURL(/\/clients$/)
  })

  test('en el optimizador, «Menú» abre la misma hoja con todo el menú', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubOptimizer(api)
    stubLists(api)

    await page.goto('/preorders/new')
    await expect(bottomNav(page)).toHaveCount(0)
    const menu = page.getByRole('button', { name: 'Menú', exact: true })
    await menu.click()
    await expect(sheet(page).getByRole('link')).toHaveText([
      'Inicio',
      'Cotizar',
      'Cotizaciones',
      'Órdenes',
      'Clientes',
      'CatálogoProductos · Familias · Servicios',
    ])
    await expect(sheet(page).getByRole('link', { name: 'Cotizar' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Esc closes it and gives the focus back to the button that opened it.
    await page.keyboard.press('Escape')
    await expect(sheet(page)).toBeHidden()
    await expect(menu).toBeFocused()

    await menu.click()
    await sheet(page).getByRole('link', { name: 'Órdenes' }).click()
    await expect(page).toHaveURL(/\/orders$/)
    await expect(bottomNav(page)).toBeVisible()
  })

  test('el «atrás» del navegador cierra la hoja con la pantalla que deja', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubLists(api)

    await page.goto('/orders')
    await bottomNav(page).getByRole('link', { name: 'Cotizaciones' }).click()
    await expect(page).toHaveURL(/\/preorders$/)
    await bottomNav(page).getByRole('button', { name: 'Más' }).click()
    await expect(sheet(page)).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/orders$/)
    await expect(sheet(page)).toBeHidden()
  })

  test('dentro de una orden, «‹ Órdenes» ocupa el lugar de la barra', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    stubLists(api)
    stubOrder(api)

    await page.goto('/orders/41')
    await expect(page.getByRole('heading', { level: 2, name: 'ORD-000041' })).toBeVisible()
    await expect(bottomNav(page)).toHaveCount(0)

    const back = page.locator('.header-back')
    await expect(back).toHaveText('‹Órdenes')
    await back.click()
    await expect(page).toHaveURL(/\/orders$/)
    await expect(bottomNav(page)).toBeVisible()
  })
})

// The Taller is a workspace: a header of its own, no sidebar and no bottom bar, and for the office
// roles a «Salir del taller» back to where they were. The rules are unit-tested (`exitFor`).
test.describe('el entorno Taller', () => {
  test(
    'el admin entra desde el menú y «Salir del taller» lo devuelve a la lista filtrada',
    { tag: '@taller' },
    async ({ page, api, loginAs }) => {
      await loginAs(['administrador'])
      stubLists(api)
      api.get('/orders/workshop-queue', [cuttingNow])
      api.get('/orders/41/cutting-plan', cuttingPlan())

      await page.goto('/orders?q=ORD-0000')
      // On screen at every width from `md`: the rail on the 960 panel, the full menu on a laptop.
      await page.locator('.side-nav__link', { hasText: 'Taller' }).click()
      await expect(page).toHaveURL(/\/workshop$/)
      await expect(page.locator('.workshop-card')).toHaveCount(1)
      // The office's shell steps aside.
      await expect(page.locator('.side-nav')).toHaveCount(0)
      await expect(page.locator('.header-breadcrumb')).toHaveCount(0)
      await expect(page).toHaveTitle('Taller · Maderable')

      // The cut and back: the round trip inside the Taller keeps the way out.
      await page.getByRole('button', { name: 'Abrir corte' }).click()
      await expect(page).toHaveURL(/\/workshop\/orders\/41$/)
      // The canvas brings its own bar: no header under it to Tab into unseen.
      await expect(page.getByRole('banner')).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Volver a Taller' }).click()
      await expect(page).toHaveURL(/\/workshop$/)

      await page.getByRole('button', { name: 'Salir del taller y volver a Órdenes' }).click()
      await expect(page).toHaveURL(/\/orders\?q=ORD-0000$/)
      await expect(page.locator('.side-nav')).toBeVisible()
    },
  )

  test('entrando por su dirección, el admin sale a Inicio', async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubHome(api, { admin: true })
    api.get('/orders/workshop-queue', [cuttingNow])

    await page.goto('/workshop')
    await page.getByRole('button', { name: /^Salir del taller/ }).click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test(
    'en el celular, el Taller del admin no tiene barra inferior y sale con «Salir»',
    { tag: '@movil' },
    async ({ page, api, loginAs }) => {
      await loginAs(['administrador'])
      stubHome(api, { admin: true })
      api.get('/orders/workshop-queue', [cuttingNow])

      await page.goto('/workshop')
      await expect(page.locator('.workshop-card')).toHaveCount(1)
      await expect(bottomNav(page)).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Menú', exact: true })).toHaveCount(0)

      const exit = page.getByRole('button', { name: 'Salir del taller y volver a Inicio' })
      await expect(exit).toHaveText('Salir', { useInnerText: true })
      await exit.click()
      await expect(page).toHaveURL(/\/home$/)
      await expect(bottomNav(page)).toBeVisible()
    },
  )
})

// The rare screens are a hub each: one menu entry, and tabs over the screens it holds. The rules
// (which tabs a role gets, what a tab carries) are unit-tested in navigation.test.ts.
test.describe('los hubs', () => {
  const tabs = (page: import('@playwright/test').Page, hub: string) =>
    page.getByRole('navigation', { name: hub })

  test('las pestañas de Estadísticas conservan el período y la sucursal', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubReports(api)

    await page.goto('/analytics/summary?period=90d&branchId=2')
    await expect(page.locator('.side-nav__link')).toHaveCount(8)
    await expect(tabs(page, 'Estadísticas').getByRole('link')).toHaveText([
      'Resumen',
      'Producción',
      'Productividad',
      'Cuellos de botella',
      'Asistencia',
    ])

    await tabs(page, 'Estadísticas').getByRole('link', { name: 'Cuellos de botella' }).click()
    await expect(page).toHaveURL(/\/analytics\/bottlenecks\?period=90d&branchId=2$/)
    await expect(page.getByRole('button', { name: '90 días' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(
      tabs(page, 'Estadísticas').getByRole('link', { name: 'Cuellos de botella' }),
    ).toHaveAttribute('aria-current', 'page')

    // The menu's entry stays lit on every tab, and the trail names the hub.
    const entry = page.locator('.side-nav__link', { hasText: 'Estadísticas' })
    await expect(entry).toHaveClass(/active/)
    await expect(entry).toHaveAttribute('aria-current', 'true')
    const trail = page.locator('.header-breadcrumb')
    await expect(trail).toContainText('Estadísticas')
    await trail.getByRole('link', { name: 'Estadísticas' }).click()
    await expect(page).toHaveURL(/\/analytics\/summary$/)
    await expect(entry).toHaveAttribute('aria-current', 'page')
  })

  test('el Catálogo del vendedor no tiene Stock bajo', async ({ page, api, loginAs }) => {
    await loginAs(['vendedor'], { user: { branchId: 1 } })
    api.list('/product-families/', [])
    api.list('/products/', [])

    await page.goto('/catalog/products?q=nogal')
    await expect(tabs(page, 'Catálogo').getByRole('link')).toHaveText([
      'Productos',
      'Familias',
      'Servicios',
    ])
    // A search in one list means nothing in the next.
    await tabs(page, 'Catálogo').getByRole('link', { name: 'Familias' }).click()
    await expect(page).toHaveURL(/\/catalog\/families$/)
    await expect(page.locator('.side-nav__link', { hasText: 'Catálogo' })).toHaveClass(/active/)
  })

  test(
    'en el celular las pestañas quedan bajo el header y muestran la que está abierta',
    { tag: '@movil' },
    async ({ page, api, loginAs }) => {
      await loginAs(['administrador'])
      stubReports(api)

      await page.goto('/analytics/attendance')
      const rail = tabs(page, 'Estadísticas')
      const current = rail.getByRole('link', { name: 'Asistencia' })
      // The four do not fit at 390px: the track scrolls to the open one and fades where it goes on.
      await expect(current).toBeInViewport({ ratio: 1 })
      await expect(rail.locator('.section-nav__track')).toHaveAttribute('data-more-start', 'true')

      // Again until it moves: the page is a screen tall until the report arrives.
      await expect
        .poll(() =>
          page.evaluate(() => {
            window.scrollTo(0, 800)
            return window.scrollY
          }),
        )
        .toBeGreaterThan(0)
      // Stuck right under the header, its 1px rule included.
      const header = await page.getByRole('banner').boundingBox()
      const headerEnd = (header?.y ?? 0) + (header?.height ?? 0)
      await expect
        .poll(async () => Math.abs(((await rail.boundingBox())?.y ?? 0) - headerEnd))
        .toBeLessThanOrEqual(1)
      await expect(current).toBeInViewport({ ratio: 1 })
    },
  )
})

// «Volver» goes back to where the screen was entered from, when the app knows it; reached by its
// URL, to the screen above it. The rules are unit-tested (`returnFor`); these check the wiring.
test.describe('volver al contexto', () => {
  test(
    'el admin vuelve del corte a la cola del Taller, no al detalle de la orden',
    { tag: '@taller' },
    async ({ page, api, loginAs }) => {
      await loginAs(['administrador'])
      api.get('/orders/workshop-queue', [cuttingNow])
      api.get('/orders/41/cutting-plan', cuttingPlan())

      await page.goto('/workshop')
      await page.getByRole('button', { name: 'Abrir corte' }).click()
      await expect(page).toHaveURL(/\/workshop\/orders\/41$/)

      await page.getByRole('button', { name: 'Volver a Taller' }).click()
      await expect(page).toHaveURL(/\/workshop$/)
    },
  )

  test('una orden abierta desde Inicio vuelve a Inicio', async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubHome(api, { admin: true })
    stubOrder(api)

    await page.goto('/home')
    await page.locator('.home .list-card', { hasText: 'ORD-000041' }).click()
    await expect(page).toHaveURL(/\/orders\/41$/)

    await page.getByRole('button', { name: 'Volver a Inicio' }).click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('la cadena se deshace paso a paso: orden → su cotización → la orden → la lista', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)
    stubOrder(api)
    stubQuote(api)

    await page.goto('/orders?q=ORD-0000')
    await page.locator('.list-table').getByText('ORD-000041').click()
    await page.getByRole('link', { name: 'Cotización PRE-000123' }).click()
    await expect(page).toHaveURL(/\/preorders\/123$/)

    // The way back names the order, not the kind of screen it is.
    await page.getByRole('button', { name: 'Volver a ORD-000041' }).click()
    await expect(page).toHaveURL(/\/orders\/41$/)
    // The order kept its own origin: the filtered list it was opened from.
    await page.getByRole('button', { name: 'Volver a Órdenes' }).click()
    await expect(page).toHaveURL(/\/orders\?q=ORD-0000$/)
  })

  test('una notificación abre la orden y «Volver» regresa a la pantalla de antes', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)
    stubOrder(api)
    api.list('/notifications/', [
      {
        id: 7,
        type: 'order.queued',
        title: 'Orden en cola',
        body: 'ORD-000041 pasó a la cola',
        orderId: 41,
        data: null,
        readAt: minutesAgo(5),
        createdAt: minutesAgo(10),
      },
    ])

    await page.goto('/clients')
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await page.getByRole('button', { name: /Orden en cola/ }).click()
    await expect(page).toHaveURL(/\/orders\/41$/)

    await page.getByRole('button', { name: 'Volver a Clientes' }).click()
    await expect(page).toHaveURL(/\/clients$/)
  })

  test('una cotización cerrada también tiene «Volver» en escritorio', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)
    stubOrder(api)
    stubQuote(api)
    api.get('/preorders/123', preOrder({ status: 'confirmed', orderId: 41 }))

    await page.goto('/preorders/123')
    await page.getByRole('button', { name: 'Ver orden' }).first().click()
    await expect(page).toHaveURL(/\/orders\/41$/)
    await page.getByRole('button', { name: 'Volver a PRE-000123' }).click()
    await expect(page).toHaveURL(/\/preorders\/123$/)
    await page.getByRole('button', { name: 'Volver a Cotizaciones' }).click()
    await expect(page).toHaveURL(/\/preorders$/)
  })

  test('un enlace directo cae en la jerarquía', async ({ page, api, loginAs }) => {
    await loginAs(['administrador'])
    stubLists(api)
    stubOrder(api)

    await page.goto('/orders/41')
    await page.getByRole('button', { name: 'Volver a Órdenes' }).click()
    await expect(page).toHaveURL(/\/orders$/)
  })

  test('«Cancelar» en Cambiar contraseña vuelve a donde se abrió el menú', async ({
    page,
    api,
    loginAs,
  }) => {
    await loginAs(['administrador'])
    stubLists(api)

    await page.goto('/clients')
    await page.locator('.avatar-initials').click()
    await page.locator('.dropdown-menu.show').getByText('Cambiar contraseña').click()
    await expect(page).toHaveURL(/\/profile\/change-password$/)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/\/clients$/)
  })

  test(
    'en el celular, el «‹» del header nombra el origen',
    { tag: '@movil' },
    async ({ page, api, loginAs }) => {
      await loginAs(['vendedor'], { user: { branchId: 1 } })
      stubHome(api)
      stubOrder(api)

      await page.goto('/home')
      await page.locator('.home .list-card', { hasText: 'ORD-000041' }).click()
      const back = page.locator('.header-back')
      await expect(back).toHaveText('‹Inicio')
      await back.click()
      await expect(page).toHaveURL(/\/home$/)
    },
  )
})
