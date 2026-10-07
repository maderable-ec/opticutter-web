import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import type { Role } from 'src/features/auth/types'
import type { MockApi } from '../fixtures/api'
import {
  boardProduct,
  branch,
  client,
  cuttingPlan,
  edgeBandingProduct,
  lowStockReport,
  minutesAgo,
  order,
  planResponse,
  preOrder,
  preOrderSummary,
  reviewPreOrder,
  stockCheck,
  user,
  workshopQueueItem,
} from '../fixtures/data'
import {
  TAPE,
  boardMaterial,
  piece,
  seedOptimizer,
  stubHome,
  stubOptimizer,
  stubReports,
} from '../fixtures/scenarios'
import { test } from '../fixtures/test'

// UX captures, not assertions: every scenario × viewport × theme writes what the user would see to
// e2e/.screens/<scenario>/<viewport>-<theme>.png, next to a .json with what a screenshot does not
// say on its own — page overflow, text clipped inside its box, and what axe finds (WCAG A/AA and its
// best practices: landmarks, heading order, dialog names).
// Nothing fails on a finding; a missing stub still fails, so a scenario never captures a half-loaded
// screen.
//
//   npm run screens                                  everything
//   npm run screens -- --grep "optimizer"            one scenario
//   npm run screens -- --grep "infinix · light"      one size and theme across scenarios
//
// A new scenario is a route, its stubs and, optionally, the clicks that reach the state to capture.

interface Scenario {
  name: string
  path: string
  // Omitted for public pages: no session at all.
  roles?: Role[]
  // Visible once the screen has its data.
  ready: string
  setup?: (api: MockApi, page: Page) => Promise<void> | void
  act?: (page: Page) => Promise<void>
  // Toasts are hidden by default: the one a scenario's setup triggers (the optimizer's «Restauramos
  // tu trabajo…») covers the header and says nothing about the screen. Set it when the toast IS
  // what the capture is about.
  keepToasts?: boolean
  // Only these viewports (by the prefix of their name): a screen that exists at one width alone,
  // like the phone's piece sheet, would otherwise capture the same laptop page twice.
  viewports?: string[]
}

// The despiece every optimizer scenario starts from, and the plan the search returns for it. The
// banded pieces carry their tape, as a seller's would once the board infers it: without one, Costos
// warns and Cotización stays closed.
const DESPIECE = [
  piece(720, 560, 2, 'Lateral', { left: true, top: true }),
  piece(764, 560, 1, 'Fondo'),
  piece(720, 396, 2, 'Puerta', { left: true, right: true, top: true, bottom: true }),
  piece(560, 100, 3, 'Travesaño', { left: true }),
  piece(2400, 600, 1, 'Mesón', { left: true, right: true }),
].map((p) =>
  Object.values(p.edgeBanding.sides).some(Boolean)
    ? { ...p, edgeBanding: { ...p.edgeBanding, productId: TAPE.id } }
    : p,
)

const seedDespiece = async (api: MockApi, page: Page) => {
  stubCatalog(api)
  api.post('/optimize/', planResponse())
  await seedOptimizer(page, [boardMaterial()], DESPIECE)
}

// A dialog is in the DOM before its fade-in ends, and axe measured its text half transparent: the
// contrast it reported depended on how far the transition had got.
// `.show` first: the fade only starts once the class lands, and a check before that found nothing
// running yet. The last one: a question asked from a dialog opens inside it.
const modalSettled = async (page: Page) => {
  await page.locator('.modal.show').last().waitFor()
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
}

// A sheet slides up from the bottom edge: captured before it ends, it sat halfway.
const sheetSettled = async (page: Page) => {
  await page.locator('.offcanvas.show').last().waitFor()
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
}

// The shop floor's queue: a prioritized head of queue, an order in process, one that has waited all
// day, and a prioritized order already on the saw — where the priority ring meets the stage spine.
const WORKSHOP_QUEUE = [
  workshopQueueItem({
    orderId: 1,
    orderCode: 'ORD-000041',
    isPriority: true,
    queuedAt: minutesAgo(20),
    client: client({ firstName: 'María Fernanda', lastName: 'Villavicencio Ortega' }),
  }),
  workshopQueueItem({
    orderId: 2,
    orderCode: 'ORD-000038',
    status: 'in_process',
    statusChangedAt: minutesAgo(95),
    progress: { cutPieces: 7, totalPieces: 18 },
    activities: [
      {
        type: 'cutting',
        status: 'in_progress',
        readyAt: minutesAgo(200),
        startedAt: minutesAgo(95),
      },
      { type: 'banding', status: 'pending', readyAt: minutesAgo(80) },
    ],
  }),
  workshopQueueItem({ orderId: 3, orderCode: 'ORD-000043', queuedAt: minutesAgo(300) }),
  workshopQueueItem({
    orderId: 4,
    orderCode: 'ORD-000036',
    status: 'in_process',
    isPriority: true,
    statusChangedAt: minutesAgo(30),
    progress: { cutPieces: 18, totalPieces: 18 },
    activities: [
      {
        type: 'cutting',
        status: 'done',
        readyAt: minutesAgo(120),
        startedAt: minutesAgo(30),
        progress: { cutPieces: 18, totalPieces: 18 },
      },
      {
        type: 'banding',
        status: 'in_progress',
        readyAt: minutesAgo(25),
        startedAt: minutesAgo(10),
        progress: { cutPieces: 6, totalPieces: 6 },
      },
    ],
  }),
]

// The e2e plan split over three boards: the first cut, the second under way, the third untouched.
const threeBoardPlan = () => {
  const plan = cuttingPlan()
  const [board] = plan.boards
  if (!board) return plan
  const total = board.pieces.length
  const sheet = (n: number, cut: number) => ({
    ...board,
    id: n,
    sheetNumber: n,
    progress: { cutPieces: cut, totalPieces: total },
    pieces: board.pieces.map((p, i) => ({ ...p, id: n * 100 + i, cut: i < cut })),
  })
  return {
    ...plan,
    progress: { cutPieces: total + 3, totalPieces: total * 3 },
    // The one the canvas opens on (the first with pieces pending) is a half, so its pill sits
    // beside a long name in the material strip and in the picker.
    boards: [sheet(1, total), { ...sheet(2, 3), halfBoard: true }, sheet(3, 0)],
  }
}

// The plan's one pattern three times over, so a viewer has pages to turn.
const threePatternPlan = () => {
  const plan = planResponse()
  return {
    ...plan,
    layoutGroups: [1, 2, 3].flatMap((n) =>
      plan.layoutGroups.slice(0, 1).map((g) => ({ ...g, patternId: n, sheetNumbers: [n] })),
    ),
  }
}

// The review's one board three times over, for the same reason.
const threeBoardReview = () => {
  const review = reviewPreOrder()
  return {
    ...review,
    totalBoardsUsed: 3,
    layoutGroups: [1, 2, 3].flatMap((n) =>
      review.layoutGroups.slice(0, 1).map((g) => ({ ...g, sheetNumbers: [n] })),
    ),
  }
}

// What the optimizer and the quote's despiece panel read from the catalog.
const stubCatalog = (api: MockApi) => stubOptimizer(api)

// A quote and an order as their detail pages read them.
const stubPreorderDetail = (api: MockApi) => {
  stubCatalog(api)
  api.get('/preorders/123', preOrder())
  api.post('/inventory/stock-check', stockCheck())
  api.get('/preorders/123/review-link', {
    status: 'active',
    createdAt: minutesAgo(60 * 20),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString(),
    usedAt: null,
  })
}

const stubOrderDetail = (api: MockApi) => {
  api.list('/branches/', [branch()])
  api.get('/orders/41', order())
  api.get('/orders/41/cutting-plan', cuttingPlan())
  api.get('/orders/41/attachments', [])
  api.post('/inventory/stock-check', stockCheck())
}

// Each part of a detail page on a phone (`Segments`), the part in the URL. «Resumen» is the
// scenario of the page itself.
// `parts` maps each scenario's suffix to the part's id in `?view=`: the suffixes stayed in Spanish
// when the ids went English (October 2026), so the baselines under `e2e/.screens/` still line up.
const partScenarios = (
  name: string,
  path: string,
  roles: Role[],
  parts: Record<string, string>,
  setup: (api: MockApi) => void,
): Scenario[] =>
  Object.entries(parts).map(([suffix, part]) => ({
    name: `${name}-${suffix}`,
    path: `${path}?view=${part}`,
    roles,
    ready: '.surface',
    viewports: ['phone'],
    setup,
  }))

const SCENARIOS: Scenario[] = [
  {
    name: 'login',
    path: '/login',
    ready: 'form',
  },
  {
    // With a despiece left open in this browser, so «Continuar despiece» shows next to «Nueva».
    name: 'home-vendedor',
    path: '/home',
    roles: ['vendedor'],
    ready: '.list-cards',
    setup: async (api, page) => {
      stubHome(api)
      await seedOptimizer(page, [boardMaterial()], DESPIECE)
    },
  },
  {
    name: 'home-admin',
    path: '/home',
    roles: ['administrador'],
    ready: '.list-cards',
    setup: (api) => stubHome(api, { admin: true }),
  },
  {
    name: 'optimizer-despiece',
    path: '/preorders/new',
    roles: ['vendedor'],
    ready: '.pieces-pane',
    setup: (api, page) => seedDespiece(api, page),
  },
  {
    // The phone's way to correct a piece: tap it in the list, edit it in the sheet.
    name: 'optimizer-pieza',
    path: '/preorders/new',
    roles: ['vendedor'],
    ready: '.pieces-pane',
    viewports: ['phone'],
    setup: (api, page) => seedDespiece(api, page),
    act: async (page) => {
      await page.locator('.piece-row').first().click()
      await page.locator('.piece-sheet.show').waitFor()
    },
  },
  {
    // A question asked from inside a dialog (`ConfirmDialog` over Borradores), on the optimizer.
    name: 'optimizer-borrador-eliminar',
    path: '/preorders/new',
    roles: ['vendedor'],
    ready: '.pieces-pane',
    setup: async (api, page) => {
      await seedDespiece(api, page)
      api.list('/optimization-drafts/', [
        {
          id: 7,
          name: 'Cocina Pérez',
          clientId: null,
          branch: branch(),
          createdAt: minutesAgo(90),
          updatedAt: minutesAgo(30),
        },
      ])
    },
    act: async (page) => {
      await page.getByRole('button', { name: 'Acciones' }).first().click()
      await page.getByRole('button', { name: 'Borradores…' }).click()
      await page.getByRole('button', { name: 'Eliminar borrador' }).click()
      await page.getByRole('alertdialog').waitFor()
      await modalSettled(page)
    },
  },
  {
    name: 'optimizer-layout',
    path: '/preorders/new?step=layout',
    roles: ['vendedor'],
    ready: '.plan-canvas svg',
    setup: (api, page) => seedDespiece(api, page),
  },
  {
    name: 'optimizer-costs',
    path: '/preorders/new?step=costs',
    roles: ['vendedor'],
    ready: '.action-bar',
    setup: (api, page) => seedDespiece(api, page),
  },
  {
    name: 'optimizer-quote',
    // The URL alone lands on Costos: Cotización only opens once a plan exists, so walk there.
    path: '/preorders/new?step=costs',
    roles: ['vendedor'],
    ready: '.action-bar',
    setup: async (api, page) => {
      await seedDespiece(api, page)
      api.list('/clients/', [client()])
      api.post('/inventory/stock-check', stockCheck())
    },
    act: async (page) => {
      await page
        .locator('.action-bar')
        .getByRole('button', { name: /Cotización/ })
        .click()
      await page.getByText('Crear cotización').first().waitFor()
    },
  },
  {
    name: 'preorders',
    path: '/preorders',
    roles: ['vendedor'],
    ready: '.surface',
    setup: (api) => {
      api.list('/branches/', [branch()])
      api.list('/clients/', [client()])
      api.list(
        '/preorders/',
        [
          preOrderSummary(),
          preOrderSummary({
            id: 124,
            code: 'PRE-000124',
            status: 'changes_requested',
            client: client({ firstName: 'María Fernanda', lastName: 'Villavicencio Ortega' }),
            notes: 'Closet dormitorio principal, puertas corredizas',
          }),
          preOrderSummary({ id: 125, code: 'PRE-000125', status: 'draft', notes: null }),
          preOrderSummary({
            id: 126,
            code: 'PRE-000126',
            status: 'confirmed',
            orderId: 41,
            orderCode: 'ORD-000041',
          }),
          preOrderSummary({ id: 127, code: 'PRE-000127', status: 'expired' }),
        ],
        37,
      )
    },
  },
  {
    name: 'preorder-detail',
    path: '/preorders/123',
    roles: ['vendedor'],
    ready: '.surface',
    setup: stubPreorderDetail,
  },
  ...partScenarios(
    'preorder-detail',
    '/preorders/123',
    ['vendedor'],
    { piezas: 'pieces', plano: 'layout' },
    stubPreorderDetail,
  ),
  {
    // The quote's «Editar despiece» panel shares the optimizer's list, and its sheet.
    name: 'preorder-piezas',
    path: '/preorders/123?panel=pieces',
    roles: ['vendedor'],
    ready: '.pieces-pane',
    viewports: ['phone'],
    setup: (api) => {
      stubCatalog(api)
      api.get('/preorders/123', preOrder())
      api.post('/inventory/stock-check', stockCheck())
      api.get('/preorders/123/review-link', {
        status: 'active',
        createdAt: minutesAgo(60 * 20),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString(),
        usedAt: null,
      })
    },
    act: async (page) => {
      await page.locator('.piece-row').first().click()
      await page.locator('.piece-sheet.show').waitFor()
    },
  },
  {
    // The plan's sheet viewer, from «Ver diagrama»: the title, «Ajustar distribución» and the
    // `Pager` share its header. On a phone the plan is its own part.
    name: 'preorder-hoja',
    path: '/preorders/123?view=layout',
    roles: ['vendedor'],
    ready: '.surface',
    setup: (api) => {
      stubPreorderDetail(api)
      api.get('/preorders/123', preOrder({ optimization: threePatternPlan() }))
    },
    act: async (page) => {
      await page.getByRole('button', { name: 'Ver diagrama' }).click()
      await page.locator('.modal.show svg').first().waitFor()
      await modalSettled(page)
    },
  },
  {
    name: 'orders',
    path: '/orders',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/branches/', [branch()])
      api.list('/clients/', [client()])
      api.list(
        '/orders/',
        [
          order(),
          order({
            id: '42',
            code: 'ORD-000042',
            status: 'confirmed',
            client: client(),
            activities: [],
            statusChangedAt: minutesAgo(60 * 30),
          }),
          order({
            id: '43',
            code: 'ORD-000043',
            status: 'queued',
            isPriority: true,
            activities: [{ type: 'cutting', status: 'pending', readyAt: minutesAgo(300) }],
            statusChangedAt: minutesAgo(300),
          }),
          order({ id: '44', code: 'ORD-000044', status: 'finished', activities: [] }),
          order({ id: '45', code: 'ORD-000045', status: 'cancelled', activities: [] }),
        ],
        52,
      )
    },
  },
  {
    // The admin's menu: «Más» on a phone (the sheet, with what the bar lacks); from `md` up it is
    // always on screen, the rail of icons over their names up to `xl` and the full menu from there.
    name: 'menu',
    path: '/clients',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/clients/', [client()])
    },
    act: async (page) => {
      const more = page.getByRole('button', { name: 'Más' })
      if (await more.isVisible()) {
        await more.click()
        await sheetSettled(page)
        return
      }
      await page.locator('.side-nav').waitFor()
    },
  },
  {
    // From `xl`, the full menu narrowed to the rail by the arrow at its foot (remembered).
    name: 'menu-angosto',
    path: '/clients',
    roles: ['administrador'],
    ready: '.surface',
    viewports: ['desktop'],
    setup: async (api, page) => {
      api.list('/clients/', [client()])
      await page.addInitScript(() => localStorage.setItem('cutter.ui.sidebarNarrow', 'true'))
    },
  },
  {
    // The optimizer has no bar: its «Menú» opens the same sheet with the whole menu.
    name: 'menu-cotizar',
    path: '/preorders/new',
    roles: ['administrador'],
    ready: '.pieces-pane',
    viewports: ['phone'],
    setup: (api, page) => seedDespiece(api, page),
    act: async (page) => {
      await page.getByRole('button', { name: 'Menú', exact: true }).click()
      await sheetSettled(page)
    },
  },
  {
    name: 'order-detail',
    path: '/orders/41',
    roles: ['administrador'],
    ready: '.surface',
    setup: stubOrderDetail,
  },
  ...partScenarios(
    'order-detail',
    '/orders/41',
    ['administrador'],
    { trabajo: 'work', cobro: 'billing', historial: 'history' },
    stubOrderDetail,
  ),
  {
    // A transition that asks for its reason: `ConfirmDialog` with a field, full screen on a phone.
    name: 'order-cancelar',
    path: '/orders/41',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      stubOrderDetail(api)
      api.get('/orders/41', order({ status: 'queued' }))
    },
    act: async (page) => {
      await page.getByRole('button', { name: 'Cancelar orden' }).click()
      await modalSettled(page)
    },
  },
  {
    name: 'workshop-canvas',
    path: '/workshop/orders/41',
    roles: ['operador'],
    ready: '.workshop-shell svg',
    setup: (api) => {
      api.get('/orders/41/cutting-plan', cuttingPlan())
    },
  },
  {
    // The board picker over a plan of three: one cut, one under way, one untouched.
    name: 'workshop-canvas-tableros',
    path: '/workshop/orders/41',
    roles: ['operador'],
    ready: '.workshop-shell svg',
    setup: (api) => {
      api.get('/orders/41/cutting-plan', threeBoardPlan())
    },
    act: async (page) => {
      await page.locator('.workshop-pager__label').click()
      await page.locator('.workshop-picker').waitFor()
      await modalSettled(page)
    },
  },
  {
    name: 'clients',
    path: '/clients',
    roles: ['vendedor'],
    ready: '.surface',
    setup: (api) => {
      api.list(
        '/clients/',
        [
          client(),
          client({
            id: '2',
            firstName: 'María Fernanda',
            lastName: 'Villavicencio Ortega',
            identifier: '1790012345001',
            email: 'mfvillavicencio@correo.ec',
          }),
          client({ id: '3', firstName: 'Carpintería', lastName: 'El Roble', phone: undefined }),
        ],
        128,
      )
    },
  },
  {
    name: 'products',
    path: '/catalog/products',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/product-families/', [])
      api.list('/products/', [
        boardProduct(),
        boardProduct({
          id: '11',
          code: 'MEL-NG-15',
          name: 'MDP MELAMÍNICO NOGAL TERRA 15MM 2150X2440',
        }),
        edgeBandingProduct(),
      ])
    },
  },
  {
    // The phone's filter sheet over the catalog, with a type ticked in the draft: the count on the
    // apply button is what the capture is about.
    name: 'products-filtros',
    path: '/catalog/products?filters=1',
    roles: ['administrador'],
    ready: '.filter-sheet .offcanvas-body',
    viewports: ['phone'],
    setup: (api) => {
      api.list('/product-families/', [])
      api.list('/products/', [boardProduct(), edgeBandingProduct()], 42)
    },
    act: async (page) => {
      await sheetSettled(page)
    },
  },
  {
    // The product form, in its sections: full screen on a phone, a large dialog from `md`.
    name: 'product-form',
    path: '/catalog/products',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/product-families/', [])
      api.list('/products/', [boardProduct()])
    },
    act: async (page) => {
      await page.getByRole('button', { name: /Nuevo producto/ }).click()
      await page.locator('.form-section').first().waitFor()
      await modalSettled(page)
    },
  },
  {
    name: 'users',
    path: '/company/users',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/branches/', [branch(), branch({ id: 2, code: 'NTE', name: 'Norte' })])
      api.list('/users/', [
        user(),
        user({
          id: 2,
          email: 'vendedora@maderable.test',
          fullName: 'María Fernanda Villavicencio',
          roles: ['vendedor'],
          branchId: 1,
        }),
        user({
          id: 3,
          email: 'taller@maderable.test',
          fullName: 'Luis Cando',
          roles: ['operador', 'canteador'],
          branchId: 2,
          isActive: false,
        }),
      ])
    },
  },
  {
    name: 'branches',
    path: '/company/branches',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/branches/', [
        branch({
          address: 'Av. de las Américas y Calle Larga',
          phone: '072345678',
          printLabelsEnabled: true,
        }),
        branch({ id: 2, code: 'NTE', name: 'Norte', isActive: false }),
      ])
    },
  },
  {
    name: 'services',
    path: '/catalog/services',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/additional-services/', [
        { id: '1', name: 'Perforación de bisagra', price: 0.5, isActive: true },
        { id: '2', name: 'Ranura para fondo', price: 1.25, isActive: true },
        { id: '3', name: 'Armado de módulo', price: 15, isActive: false },
      ])
    },
  },
  {
    name: 'families',
    path: '/catalog/families',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      const family = {
        description: null,
        hasNoBoards: false,
        hasNoEdgeBandings: false,
        uncoveredThicknesses: [],
        missingAliasCount: 0,
      }
      api.list('/product-families/', [
        {
          ...family,
          id: 1,
          name: 'Cashmere',
          boardCount: 3,
          edgeBandingCount: 2,
          aliases: ['CSH'],
        },
        {
          ...family,
          id: 2,
          name: 'Nogal Terra',
          description: 'Madera oscura, veta horizontal',
          boardCount: 2,
          edgeBandingCount: 0,
          hasNoEdgeBandings: true,
          aliases: [],
        },
        {
          ...family,
          id: 3,
          name: 'Blanco',
          boardCount: 4,
          edgeBandingCount: 3,
          uncoveredThicknesses: [36],
          aliases: ['BLN', 'BL'],
          missingAliasCount: 1,
        },
      ])
    },
  },
  {
    // A family opened from its row: its state, its boards and tapes, and «Editar» inside it (the
    // row only keeps delete beside it). One tape without an alias, so the warning shows.
    name: 'families-familia',
    path: '/catalog/families',
    roles: ['administrador'],
    ready: '.list-table:visible, .list-cards:visible',
    setup: (api) => {
      const blanco = {
        id: 3,
        name: 'Blanco',
        description: 'Blanco liso, el de más salida',
        boardCount: 1,
        edgeBandingCount: 2,
        hasNoBoards: false,
        hasNoEdgeBandings: false,
        uncoveredThicknesses: [36],
        aliases: ['BLN'],
        missingAliasCount: 1,
      }
      api.list('/product-families/', [blanco])
      api.get('/product-families/3', {
        ...blanco,
        boards: [boardProduct()],
        edgeBandings: [
          edgeBandingProduct(),
          edgeBandingProduct({ id: '21', code: 'TC-BL-22', alias: null }),
        ],
      })
    },
    act: async (page) => {
      await page.locator('.list-card:visible, .list-table tbody tr:visible').first().click()
      await modalSettled(page)
    },
  },
  {
    name: 'settings',
    path: '/company/settings',
    roles: ['administrador'],
    ready: 'input',
    setup: (api) => {
      api.get('/settings/cutting', {
        kerf: 4,
        topTrim: 10,
        bottomTrim: 10,
        leftTrim: 10,
        rightTrim: 10,
        edgeBandingWasteFactor: 0.1,
        halfBoardMarkupPct: 0.15,
      })
      api.get('/settings/preorders', { preorderValidityDays: 15, maxOpenPreordersPerClient: 5 })
      api.get('/settings/taxes', { taxRate: 0.15 })
      api.get('/settings/stock', { board: 10, edgeBanding: 50 })
      api.get('/settings/company', {
        name: 'MADERABLE',
        tagline: 'Tableros, cortes y cantos a medida',
        email: 'ventas@maderable.ec',
        phone: '0991234567',
        branches: [
          { name: 'Matriz', address: 'Av. de las Américas y Calle Larga, Cuenca' },
          { name: 'Norte', address: 'Av. Ordóñez Lasso 4-12, Cuenca' },
        ],
      })
    },
  },
  {
    name: 'profile',
    path: '/profile',
    roles: ['vendedor'],
    ready: 'form',
  },
  {
    name: 'change-password',
    path: '/profile/change-password',
    roles: ['vendedor'],
    ready: 'form',
  },
  {
    name: 'dashboard',
    path: '/analytics/summary',
    roles: ['administrador'],
    ready: '.comparison__value:visible',
    setup: stubReports,
  },
  {
    name: 'production',
    path: '/analytics/production',
    roles: ['administrador'],
    ready: '.production-stops',
    setup: stubReports,
  },
  {
    // The phone's filter sheet, with a branch picked: it narrows the production detail.
    name: 'dashboard-filtros',
    path: '/analytics/production?branchId=2',
    roles: ['administrador'],
    ready: '.production-stops',
    viewports: ['phone'],
    setup: stubReports,
    act: async (page) => {
      await page.getByRole('button', { name: /Filtros/ }).click()
      await sheetSettled(page)
    },
  },
  {
    name: 'bottlenecks',
    path: '/analytics/bottlenecks',
    roles: ['administrador'],
    ready: 'canvas',
    setup: stubReports,
  },
  {
    name: 'productivity',
    path: '/analytics/productivity',
    roles: ['administrador'],
    ready: '.list-card:visible, .list-table tbody tr:visible',
    setup: stubReports,
  },
  {
    // The banders' report: what was registered after the work carries no time.
    name: 'productivity-banders',
    path: '/analytics/productivity?role=canteador',
    roles: ['administrador'],
    ready: '.list-card:visible, .list-table tbody tr:visible',
    setup: stubReports,
  },
  {
    // The detail behind a person's row, one per team: the orders a seller collected, the sheets
    // that count for an operator, the work of a bander.
    name: 'seller-orders',
    path: '/analytics/productivity?user=2',
    roles: ['administrador'],
    ready: '.ledger__item',
    setup: stubReports,
    act: modalSettled,
  },
  {
    name: 'operator-boards',
    path: '/analytics/productivity?role=operador&user=3',
    roles: ['administrador'],
    ready: '.ledger__item',
    setup: stubReports,
    act: modalSettled,
  },
  {
    name: 'bander-orders',
    path: '/analytics/productivity?role=canteador&user=5',
    roles: ['administrador'],
    ready: '.ledger__item',
    setup: stubReports,
    act: modalSettled,
  },
  {
    name: 'attendance',
    path: '/analytics/attendance',
    roles: ['administrador'],
    ready: '.attendance-entry:visible',
    setup: stubReports,
  },
  {
    name: 'low-stock',
    path: '/catalog/low-stock',
    roles: ['administrador'],
    ready: '.surface',
    setup: (api) => {
      api.list('/branches/', [branch()])
      api.get('/inventory/low-stock', lowStockReport())
    },
  },
  {
    name: 'workshop-board',
    path: '/workshop',
    roles: ['operador'],
    ready: '.workshop-card',
    setup: (api) => {
      api.get('/orders/workshop-queue', WORKSHOP_QUEUE)
    },
  },
  {
    // The Taller as the admin enters it: the workspace's header with its «Salir del taller».
    name: 'workshop-board-admin',
    path: '/workshop',
    roles: ['administrador'],
    ready: '.workshop-card',
    setup: (api) => {
      api.get('/orders/workshop-queue', WORKSHOP_QUEUE)
    },
  },
  {
    // The materials of the head of the queue, the dialog that pages through the whole board.
    name: 'workshop-board-materiales',
    path: '/workshop',
    roles: ['operador'],
    ready: '.workshop-card',
    setup: (api) => {
      api.get('/orders/workshop-queue', WORKSHOP_QUEUE)
    },
    act: async (page) => {
      await page.locator('.usage-summary').first().click()
      await page.locator('.materials-table').first().waitFor()
      await modalSettled(page)
    },
  },
  {
    // The shop floor's question: the verb and the order in the title, `lg` buttons.
    name: 'workshop-board-tomar',
    path: '/workshop',
    roles: ['operador'],
    ready: '.workshop-card',
    setup: (api) => {
      api.get('/orders/workshop-queue', WORKSHOP_QUEUE)
    },
    act: async (page) => {
      await page.getByRole('button', { name: 'Tomar' }).first().click()
      await modalSettled(page)
    },
  },
  {
    name: 'review',
    path: '/review/e2e-token',
    ready: 'h1',
    setup: (api) => {
      api.get('/public/review/e2e-token', reviewPreOrder())
    },
  },
  {
    // A board of the plan, enlarged: the client's viewer, with the `Pager` in its header.
    name: 'review-hoja',
    path: '/review/e2e-token',
    ready: 'h1',
    setup: (api) => {
      api.get('/public/review/e2e-token', threeBoardReview())
    },
    act: async (page) => {
      await page.getByRole('button', { name: 'Ampliar' }).first().click()
      await page.locator('.modal.show svg').first().waitFor()
      await modalSettled(page)
    },
  },
]

// The phone widths a seller or an admin actually holds (360 is the narrowest Android still sold,
// 412 the widest common one), a portrait tablet, the laptop the despiece was measured on, and the
// two shop-floor tablets with the browser bar taken off (see playwright.config.ts).
const PHONE = { hasTouch: true, isMobile: true }
const VIEWPORTS = {
  'phone-360': { viewport: { width: 360, height: 780 }, ...PHONE },
  'phone-375': { viewport: { width: 375, height: 812 }, ...PHONE },
  'phone-390': { viewport: { width: 390, height: 844 }, ...PHONE },
  'phone-412': { viewport: { width: 412, height: 915 }, ...PHONE },
  'tablet-768': { viewport: { width: 768, height: 1024 }, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 } },
  infinix: { viewport: { width: 960, height: 544 }, hasTouch: true },
  ipad: { viewport: { width: 1080, height: 735 }, hasTouch: true },
}

const THEMES = ['light', 'dark'] as const

const OUT_DIR = path.resolve(__dirname, '../.screens')

// Page overflow and text clipped inside its own box: the two things that read as a broken screen
// and that nobody notices in a screenshot until they look for them.
const measure = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement
    const describe = (el: Element): string => {
      const classes = [...el.classList].slice(0, 2).map((c) => `.${c}`)
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${classes.join('')}`
    }
    const clipped: { element: string; text: string; hiddenPx: number; ellipsis: boolean }[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (clipped.length >= 25) break
      // Screen-reader text (the skip link included, until the keyboard reaches it) is clipped by
      // design. The menu's names are not: a name the rail cuts short shows up here.
      if (el.closest('.visually-hidden, .visually-hidden-focusable')) continue
      const style = getComputedStyle(el)
      if (!['hidden', 'clip'].includes(style.overflowX) || el.clientWidth === 0) continue
      const hiddenPx = el.scrollWidth - el.clientWidth
      const ellipsis = style.textOverflow === 'ellipsis'
      // `scrollWidth` rounds to whole pixels: an 83.2px name in an 83px box reads as fitting while
      // the browser draws its «…». With an ellipsis, measure the text itself.
      let subpixelPx = 0
      if (ellipsis && hiddenPx <= 1) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const inner =
          el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        subpixelPx = range.getBoundingClientRect().width - inner
      }
      const text = el.innerText?.trim()
      if ((hiddenPx <= 1 && subpixelPx <= 0.5) || !text) continue
      const parent = el.parentElement ? `${describe(el.parentElement)} > ` : ''
      clipped.push({
        element: `${parent}${describe(el)}`,
        text: text.slice(0, 80),
        hiddenPx: Math.max(hiddenPx, Math.ceil(subpixelPx)),
        ellipsis,
      })
    }
    // A table that scrolls sideways inside its own box leaves the document at its width, so the
    // page reports no overflow while a phone user swipes the table. Report those boxes too.
    const scrollersX: { element: string; hiddenPx: number }[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (scrollersX.length >= 10) break
      const style = getComputedStyle(el)
      if (!['auto', 'scroll'].includes(style.overflowX) || el.clientWidth === 0) continue
      const hiddenPx = el.scrollWidth - el.clientWidth
      if (hiddenPx > 1) scrollersX.push({ element: describe(el), hiddenPx })
    }
    return {
      size: { width: window.innerWidth, height: window.innerHeight },
      overflowY: Math.max(0, doc.scrollHeight - window.innerHeight),
      overflowX: Math.max(0, doc.scrollWidth - window.innerWidth),
      scrollersX,
      clipped,
    }
  })

const accessibility = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze()
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }))
}

for (const scenario of SCENARIOS) {
  for (const [viewportName, options] of Object.entries(VIEWPORTS)) {
    if (scenario.viewports && !scenario.viewports.some((v) => viewportName.startsWith(v))) continue
    for (const theme of THEMES) {
      test.describe(() => {
        test.use({ ...options, colorScheme: theme })

        test(`${scenario.name} · ${viewportName} · ${theme}`, async ({ page, api, loginAs }) => {
          if (scenario.roles) await loginAs(scenario.roles, { user: { branchId: 1 } })
          await scenario.setup?.(api, page)
          await page.addInitScript((mode) => {
            localStorage.setItem('coreui-free-react-admin-template-theme', mode)
          }, theme)

          await page.goto(scenario.path)
          await page.locator(scenario.ready).first().waitFor()
          await scenario.act?.(page)
          // Toasts go unless the scenario keeps them (the dev-only React Query button is hidden by
          // the `page` fixture).
          if (!scenario.keepToasts) {
            await page.addStyleTag({ content: '.toaster { display: none !important }' })
          }
          await page.evaluate(() => document.fonts.ready)

          const dir = path.join(OUT_DIR, scenario.name)
          fs.mkdirSync(dir, { recursive: true })
          const base = path.join(dir, `${viewportName}-${theme}`)
          await page.screenshot({ path: `${base}.png`, animations: 'disabled' })
          const report = {
            scenario: scenario.name,
            viewport: viewportName,
            theme,
            ...(await measure(page)),
            axe: await accessibility(page),
          }
          fs.writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`)
        })
      })
    }
  }
}
