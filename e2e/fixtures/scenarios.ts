import type { Page, Request } from '@playwright/test'
import type { MaterialForm, RequirementForm } from 'src/features/optimizer/optimizerForm'
import type { OptimizerAutosave } from 'src/features/optimizer/optimizerStorage'
import type { Product } from 'src/features/products/types'
import type { MockApi } from './api'
import {
  attendanceReport,
  banderReport,
  boardProduct,
  bottlenecksReport,
  branch,
  branchComparison,
  client,
  edgeBandingProduct,
  lowStockReport,
  minutesAgo,
  banderOrders,
  operatorBoards,
  operatorReport,
  order,
  preOrderSummary,
  productionReport,
  productionStatus,
  sellerOrders,
  sellerReport,
} from './data'

// The stubs a whole screen needs to load, shared by the specs and the UX captures.

export const BOARD = boardProduct()
export const TAPE = edgeBandingProduct()

/** A material group already on the catalog board, as the autosave stores it. */
export const boardMaterial = (overrides: Partial<MaterialForm> = {}): MaterialForm => ({
  uid: 'mat-e2e',
  boardId: BOARD.id,
  label: '',
  offcuts: [],
  fillOrder: 'auto',
  applyPriceLevel: false,
  wholeBoard: false,
  skipTrim: false,
  ...overrides,
})

/** A row of the pieces table. `canto` uses the Canto column's own notation. */
export const piece = (
  height: number,
  width: number,
  quantity: number,
  label: string,
  canto: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean } = {},
): RequirementForm => ({
  materialUid: 'mat-e2e',
  height,
  width,
  quantity,
  label,
  canRotate: false,
  hardEdgeCut: true,
  edgeBanding: {
    productId: '',
    sides: { left: false, right: false, top: false, bottom: false, ...canto },
    bandType: Object.keys(canto).length > 0 ? 'Soft' : '',
  },
  specialEdges: [],
  hingingCode: '',
  groovingCode: '',
  assemblyCode: '',
  divisionCode: '',
})

/**
 * Opens `/preorders/new` on a workspace of our own by writing the autosave before the app boots,
 * which is far cheaper than driving the material modal. It runs on every navigation of the page, so
 * a test that reloads to check what the autosave restored gets this seed back, not its own edits.
 */
export const seedOptimizer = async (
  page: Page,
  materials: MaterialForm[],
  requirements: RequirementForm[] = [],
) => {
  const autosave: OptimizerAutosave = {
    version: 1,
    savedAt: Date.now(),
    draftId: null,
    draftName: '',
    materials,
    requirements,
    services: [],
  }
  await page.addInitScript((data) => {
    localStorage.setItem('cutter:optimizer:autosave:v1', data)
  }, JSON.stringify(autosave))
}

/** `/preorders/new` with an empty workspace: one board and one tape in the catalog, no drafts. */
export const stubOptimizer = (api: MockApi) =>
  api
    .list('/branches/', [branch()])
    .list('/optimization-drafts/', [])
    // `listAll` pages through `/products/?type=…`: one call per product type.
    .list<Product>('/products/', (req) =>
      new URL(req.url()).searchParams.get('type') === 'edge_banding' ? [TAPE] : [BOARD],
    )
    .get(`/products/${BOARD.id}/edge-bandings`, [TAPE])
    // The Costos step's service picker.
    .list('/additional-services/', [])

const DAY_MS = 24 * 60 * 60_000
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString()

// What each count on Inicio answers, by the status it asks for. A count is a listing asked for one
// row, so the number lives in `pagination.total`.
export const HOME_TOTALS: Record<string, number> = {
  changes_requested: 2,
  confirmed: 3,
  finished: 1,
  queued: 4,
  in_process: 2,
}

const query = (req: Request) => new URL(req.url()).searchParams

// The oldest open quotes, of which two lapse within three days.
const openQuotes = () => [
  preOrderSummary({ id: 120, code: 'PRE-000120', expiresAt: inDays(1) }),
  preOrderSummary({ id: 121, code: 'PRE-000121', status: 'draft', expiresAt: inDays(2.5) }),
  preOrderSummary({ id: 122, code: 'PRE-000122', expiresAt: inDays(6) }),
]

const homeOrders = (req: Request) => {
  const q = query(req)
  if (q.get('sort') === 'stalest')
    return [
      order({ id: '43', code: 'ORD-000043', status: 'queued', queuedAt: minutesAgo(60 * 26) }),
      order({ statusChangedAt: minutesAgo(60 * 5) }),
      order({
        id: '44',
        code: 'ORD-000044',
        status: 'queued',
        queuedAt: minutesAgo(90),
        client: client(),
      }),
    ]
  // The admin's «Hoy»: two orders born today, one of them with a half board.
  if (q.get('createdFrom'))
    return [
      order({
        id: '46',
        code: 'ORD-000046',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }),
      order({
        id: '47',
        code: 'ORD-000047',
        status: 'confirmed',
        total: 138.2,
        createdAt: new Date().toISOString(),
        lines: order().lines.map((l) =>
          l.linearM == null ? { ...l, quantity: 2, halfBoard: true } : l,
        ),
      }),
    ]
  return [order()]
}

/** Inicio: the office's counts, and with `admin` the day's figures and the stock report too. */
export const stubHome = (api: MockApi, { admin = false } = {}) => {
  api.list('/branches/', [branch(), branch({ id: 2, code: 'NTE', name: 'Norte' })])
  api.list(
    '/preorders/',
    (req) => (query(req).getAll('status').length > 1 ? openQuotes() : [preOrderSummary()]),
    (req) => {
      const statuses = query(req).getAll('status')
      return statuses.length === 1 ? (HOME_TOTALS[statuses[0] ?? ''] ?? 0) : openQuotes().length
    },
  )
  api.list('/orders/', homeOrders, (req) => {
    const statuses = query(req).getAll('status')
    return query(req).get('limit') === '1'
      ? (HOME_TOTALS[statuses[0] ?? ''] ?? 0)
      : homeOrders(req).length
  })
  api.get('/orders/production-status', productionStatus())
  if (admin) {
    api.get('/inventory/low-stock', lowStockReport())
    // «Hoy»: today's payments, read off the branch comparison of today alone.
    api.get('/analytics/branch-comparison', branchComparison())
  }
}

/** The reports' endpoints (`/analytics/*`), the live state and the branches the filter lists. */
export const stubReports = (api: MockApi) => {
  api.list('/branches/', [branch(), branch({ id: 2, code: 'NTE', name: 'Norte' })])
  api.get('/orders/production-status', productionStatus())
  api.get('/analytics/branch-comparison', branchComparison())
  api.get('/analytics/production', productionReport())
  api.get('/analytics/bottlenecks', bottlenecksReport())
  api.get('/analytics/productivity/sellers', sellerReport())
  api.get(/^\/analytics\/productivity\/sellers\/\d+\/orders$/, sellerOrders())
  api.get('/analytics/productivity/operators', operatorReport())
  api.get(/^\/analytics\/productivity\/operators\/\d+\/boards$/, operatorBoards())
  api.get('/analytics/productivity/banders', banderReport())
  api.get(/^\/analytics\/productivity\/banders\/\d+\/orders$/, banderOrders())
  api.get('/analytics/attendance', attendanceReport())
}
