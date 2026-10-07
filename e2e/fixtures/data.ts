import type { User } from 'src/features/auth/types'
import type { Branch, BranchRef } from 'src/features/branches/types'
import type { Client } from 'src/features/clients/types'
import type {
  AttendanceData,
  BanderOrdersReport,
  BanderReport,
  BottlenecksData,
  BranchComparison,
  BranchFigures,
  OperatorBoard,
  OperatorBoardsReport,
  OperatorReport,
  ProductionReport,
  SellerOrdersReport,
  SellerReport,
} from 'src/features/analytics/types'
import type { Role } from 'src/features/auth/types'
import type { LowStockReport, StockCheckResult } from 'src/features/inventory/types'
import type {
  Layout,
  OptimizeResponse,
  PlacedPiece,
  UnplacedPiece,
} from 'src/features/optimizer/types'
import type {
  CutPiece,
  CuttingPlan,
  Order,
  ProductionStatusReport,
  WorkshopQueueItem,
} from 'src/features/orders/types'
import type { PreOrder, PreOrderSummary } from 'src/features/preorders/types'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import type { ReviewPreOrder } from 'src/features/review/types'
import type { EdgeSide } from 'src/shared/utils/cutDrawing'

// Stub data typed against the app's own types: when an API contract changes, the stubs stop
// compiling instead of drifting. Every factory takes overrides; the defaults are the smallest
// value the screens render without tripping.

export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export const user = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: 'e2e@maderable.test',
  fullName: 'Usuario E2E',
  roles: ['administrador'],
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  branchId: null,
  ...overrides,
})

export const client = (overrides: Partial<Client> = {}): Client => ({
  id: '1',
  firstName: 'Ana',
  lastName: 'Pérez',
  identifier: '0102030405',
  phone: '0991234567',
  ...overrides,
})

export const branch = (overrides: Partial<Branch> = {}): Branch => ({
  id: 1,
  code: 'MTZ',
  name: 'Matriz',
  address: null,
  phone: null,
  isActive: true,
  warehouseCode: null,
  printLabelsEnabled: false,
  printConsolidatedEnabled: false,
  ...overrides,
})

// A melamine board in the catalog. Dimensions live under `attributes`, as the API sends them.
export const boardProduct = (overrides: Partial<BoardProduct> = {}): BoardProduct => ({
  id: '10',
  code: 'MEL-BL-18',
  name: 'MELAMINA BLANCA 18MM',
  price: 60,
  priceWithTax: 69,
  isActive: true,
  type: 'board',
  attributes: { height: 2440, width: 2150, thickness: 18 },
  ...overrides,
})

export const edgeBandingProduct = (
  overrides: Partial<EdgeBandingProduct> = {},
): EdgeBandingProduct => ({
  id: '20',
  code: 'TC-BL-19',
  name: 'TAPACANTO BLANCO 19X0.45MM',
  price: 0.4,
  priceWithTax: 0.46,
  isActive: true,
  alias: 'BLN',
  type: 'edge_banding',
  attributes: { bandType: 'Soft', width: 19, thickness: 0.45 },
  ...overrides,
})

// A quote as the client sees it through the public link: one board, two pieces.
export const reviewPreOrder = (overrides: Partial<ReviewPreOrder> = {}): ReviewPreOrder => ({
  reference: 'PRE-000123',
  status: 'sent',
  orderCode: null,
  clientName: 'Ana Pérez',
  clientNote: null,
  notes: 'Cocina edificio Norte',
  currency: 'USD',
  subtotal: 100,
  taxRate: 0.15,
  taxAmount: 15,
  total: 115,
  totalBoardsUsed: 1,
  totalPieces: 2,
  createdAt: minutesAgo(60 * 24),
  sentAt: minutesAgo(60 * 24),
  confirmedAt: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
  lines: [
    { productName: 'MELAMINA BLANCA 18MM', quantity: 1, unitPrice: 60, lineTotal: 60 },
    {
      productName: 'TAPACANTO BLANCO 19X0.45MM',
      quantity: 1,
      unitPrice: 0.4,
      lineTotal: 40,
      linearM: 100,
    },
  ],
  pieces: [
    {
      label: 'Lateral',
      materialName: 'MELAMINA BLANCA 18MM',
      height: 720,
      width: 560,
      quantity: 2,
      edges: { sides: ['left'], bandType: 'Soft', notation: '1L CS BLN' },
    },
  ],
  layoutGroups: [
    {
      count: 1,
      sheetNumbers: [1],
      sheet: {
        materialName: 'MELAMINA BLANCA 18MM',
        width: 2150,
        height: 2440,
        thickness: 18,
        halfBoard: false,
      },
      placedPieces: [0, 1].map((i) => ({
        pieceId: `Lateral#${i + 1}`,
        x: 0,
        y: i * 560,
        width: 720,
        height: 560,
        rotated: false,
        originalWidth: 560,
        originalHeight: 720,
      })),
      remainders: [],
      piecesCount: 2,
    },
  ],
  ...overrides,
})

// An order waiting on the shop floor, ready to be taken.
export const workshopQueueItem = (
  overrides: Partial<WorkshopQueueItem> = {},
): WorkshopQueueItem => ({
  orderId: 1,
  orderCode: 'ORD-000045',
  status: 'queued',
  notes: 'Cocina edificio Norte',
  isPriority: false,
  createdAt: minutesAgo(180),
  queuedAt: minutesAgo(45),
  statusChangedAt: minutesAgo(45),
  client: client(),
  boardUsage: [
    { materialKey: 'm1', name: 'MELAMINA BLANCA 18MM', count: 3, fullCount: 3, halfCount: 0 },
  ],
  bandingUsage: [{ name: 'TAPACANTO BLANCO 19X0.45MM', bandType: 'Soft', linearM: 24.5 }],
  progress: { cutPieces: 0, totalPieces: 18 },
  activities: [
    { type: 'cutting', status: 'pending', readyAt: minutesAgo(45) },
    { type: 'banding', status: 'pending', readyAt: null },
  ],
  printConsolidatedEnabled: false,
  ...overrides,
})

// A plan that places nothing: every piece comes back in `unplaced`, which must close Cotización.
export const unplacedOptimizeResponse = (unplaced: UnplacedPiece[]): OptimizeResponse => ({
  id: null,
  client: null,
  optimizationHash: 'e2e-unplaced',
  totalBoardsUsed: 0,
  layouts: [],
  materialsSummary: [],
  edgeBandingsSummary: [],
  layoutGroups: [],
  pricing: {
    priceLevel: 1,
    priceLevelName: 'Precio 1',
    subtotal: 0,
    taxRate: 0.15,
    taxAmount: 0,
    total: 0,
  },
  unplaced,
})

// --- A realistic plan: the five pieces `optimizer-despiece` seeds, cut from one board ---

type Edges = NonNullable<PlacedPiece['edges']>

const tapeEdges = (sides: Edges['sides'], notation: string): Edges => ({
  sides,
  product_id: 20,
  code: 'TC-BL-19',
  color: null,
  notation,
})

// Board space: x across the 2150 width, y along the 2440 length, 4 mm of kerf between pieces.
const placed = (
  pieceId: string,
  x: number,
  y: number,
  height: number,
  width: number,
  edges: Edges | null = null,
): PlacedPiece => ({
  pieceId,
  x,
  y,
  height,
  width,
  rotated: false,
  originalHeight: height,
  originalWidth: width,
  edges,
})

const PLAN_PIECES: PlacedPiece[] = [
  placed('Mesón#1', 0, 0, 2400, 600, tapeEdges(['left', 'right'], '2L CS BLN')),
  placed('Lateral#1', 604, 0, 720, 560, tapeEdges(['left', 'top'], '1L1C CS BLN')),
  placed('Lateral#2', 604, 724, 720, 560, tapeEdges(['left', 'top'], '1L1C CS BLN')),
  placed('Fondo#1', 604, 1448, 764, 560),
  placed('Puerta#1', 1168, 0, 720, 396, tapeEdges(['left', 'right', 'top', 'bottom'], '4L CS BLN')),
  placed(
    'Puerta#2',
    1168,
    724,
    720,
    396,
    tapeEdges(['left', 'right', 'top', 'bottom'], '4L CS BLN'),
  ),
  placed('Travesaño#1', 1168, 1448, 560, 100, tapeEdges(['left'], '1L CS BLN')),
  placed('Travesaño#2', 1272, 1448, 560, 100, tapeEdges(['left'], '1L CS BLN')),
  placed('Travesaño#3', 1376, 1448, 560, 100, tapeEdges(['left'], '1L CS BLN')),
]

// The workshop codes of the plan's cut list, by base label. The seller's diagram and the operator's
// canvas draw the same sheet, so both carry them.
const PLAN_CODES: Record<string, Pick<PlacedPiece, 'hingingCode' | 'groovingCode'>> = {
  Lateral: { hingingCode: 'B2' },
  Puerta: { hingingCode: 'B2' },
  Fondo: { groovingCode: 'R1' },
}
const planCodes = (pieceId: string) => PLAN_CODES[pieceId.replace(/#\d+$/, '')]

const PLAN_LAYOUT: Layout = {
  material: {
    materialKey: 'mat-e2e',
    sheetNumber: 1,
    height: 2440,
    width: 2150,
    thickness: 18,
    area: 5.246,
  },
  placedPieces: PLAN_PIECES.map((p) => ({ ...p, ...planCodes(p.pieceId) })),
  statistics: {
    usedArea: 3.41248,
    wasteArea: 1.83352,
    efficiency: 65.05,
    piecesCount: PLAN_PIECES.length,
    cutLinearM: 18.2,
    edgeBandingLinearM: 10.3,
  },
  remainders: [
    { x: 1568, y: 0, height: 2440, width: 582 },
    { x: 1168, y: 2012, height: 428, width: 400 },
    { x: 604, y: 2216, height: 224, width: 560 },
  ],
}

/** `POST /optimize/` for the despiece `optimizer-despiece` seeds: one board, nothing left out. */
export const planResponse = (overrides: Partial<OptimizeResponse> = {}): OptimizeResponse => ({
  id: null,
  client: null,
  optimizationHash: 'e2e-plan',
  totalBoardsUsed: 1,
  totalBoardsCost: 60,
  totalEdgeBandingCost: 4.4,
  totalCutLinearM: 18.2,
  totalEdgeBandingLinearM: 10.3,
  layouts: [PLAN_LAYOUT],
  materialsSummary: [
    {
      materialKey: 'mat-e2e',
      source: 'catalog',
      productId: 10,
      productCode: 'MEL-BL-18',
      productName: 'MELAMINA BLANCA 18MM',
      height: 2440,
      width: 2150,
      thickness: 18,
      count: 1,
      totalAreaM2: 5.246,
      avgEfficiency: 65.05,
      costPerUnit: 60,
      totalCost: 60,
    },
  ],
  edgeBandingsSummary: [
    {
      productId: 20,
      productCode: 'TC-BL-19',
      productName: 'TAPACANTO BLANCO 19X0.45MM',
      thickness: 0.45,
      netLinearM: 9.4,
      linearM: 10.3,
      billedLinearM: 11,
      pricePerM: 0.4,
      totalCost: 4.4,
    },
  ],
  layoutGroups: [
    { patternId: 1, count: 1, sheetNumbers: [1], materialKey: 'mat-e2e', layout: PLAN_LAYOUT },
  ],
  pricing: {
    priceLevel: 1,
    priceLevelName: 'Precio 1',
    subtotal: 64.4,
    taxRate: 0.15,
    taxAmount: 9.66,
    total: 74.06,
  },
  variant: 0,
  unplaced: [],
  ...overrides,
})

// --- Quotes and orders ---

const BRANCH_REF = { id: 1, code: 'MTZ', name: 'Matriz' } as BranchRef

export const preOrderSummary = (overrides: Partial<PreOrderSummary> = {}): PreOrderSummary => ({
  id: 123,
  code: 'PRE-000123',
  client: client(),
  branch: BRANCH_REF,
  status: 'sent',
  notes: 'Cocina edificio Norte',
  source: 'optimizer',
  orderId: null,
  orderCode: null,
  createdAt: minutesAgo(60 * 24),
  updatedAt: minutesAgo(60 * 5),
  expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
  ...overrides,
})

/** `GET /preorders/:id`: the plan above, with the payload that produced it. */
export const preOrder = (overrides: Partial<PreOrder> = {}): PreOrder => ({
  ...preOrderSummary(),
  clientNote: null,
  sentAt: minutesAgo(60 * 20),
  confirmedAt: null,
  priceLevel: 1,
  variant: 0,
  layoutAdjustments: null,
  materials: [{ key: 'mat-e2e', source: 'catalog', productId: 10 }],
  requirements: [
    [2400, 600, 1, 'Mesón', ['left', 'right']],
    [720, 560, 2, 'Lateral', ['left', 'top']],
    [764, 560, 1, 'Fondo', []],
    [720, 396, 2, 'Puerta', ['left', 'right', 'top', 'bottom']],
    [560, 100, 3, 'Travesaño', ['left']],
  ].map(([height, width, quantity, label, sides], i) => ({
    materialKey: 'mat-e2e',
    height: height as number,
    width: width as number,
    quantity: quantity as number,
    priority: i,
    label: label as string,
    canRotate: false,
    edgeBanding: { sides: sides as EdgeSide[], productId: 20 },
  })),
  additionalServices: [],
  optimization: planResponse(),
  optimizationSource: 'live',
  history: [
    {
      id: 1,
      toStatus: 'draft',
      actor: 'staff',
      actorLabel: 'Usuario E2E',
      createdAt: minutesAgo(60 * 24),
    },
    {
      id: 2,
      fromStatus: 'draft',
      toStatus: 'sent',
      actor: 'staff',
      actorLabel: 'Usuario E2E',
      createdAt: minutesAgo(60 * 20),
    },
  ],
  ...overrides,
})

export const order = (overrides: Partial<Order> = {}): Order => ({
  id: '41',
  code: 'ORD-000041',
  status: 'in_process',
  subtotal: 64.4,
  total: 74.06,
  priceLevel: 1,
  priceLevelName: 'Precio 1',
  taxRate: 0.15,
  taxAmount: 9.66,
  additionalServicesTotal: 0,
  additionalServices: [],
  client: client({ firstName: 'María Fernanda', lastName: 'Villavicencio Ortega' }),
  branch: BRANCH_REF,
  lines: [
    {
      id: 'l1',
      productId: 10,
      productCode: 'MEL-BL-18',
      productName: 'MELAMINA BLANCA 18MM',
      quantity: 1,
      unitPriceSnapshot: 60,
      lineTotal: 60,
      avgEfficiency: 65.05,
      totalAreaM2: 5.246,
    },
    {
      id: 'l2',
      productId: 20,
      productCode: 'TC-BL-19',
      productName: 'TAPACANTO BLANCO 19X0.45MM',
      quantity: 11,
      unitPriceSnapshot: 0.4,
      lineTotal: 4.4,
      linearM: 11,
    },
  ],
  pieces: [
    ['Mesón', 2400, 600, 1, ['left', 'right'], {}],
    ['Lateral', 720, 560, 2, ['left', 'top'], { hingingCode: 'B2' }],
    ['Fondo', 764, 560, 1, [], { groovingCode: 'R1' }],
    ['Puerta', 720, 396, 2, ['left', 'right', 'top', 'bottom'], { hingingCode: 'B2' }],
    ['Travesaño', 560, 100, 3, ['left'], {}],
  ].map(([label, height, width, quantity, sides, codes], i) => ({
    id: `p${i + 1}`,
    materialKey: 'mat-e2e',
    productId: 10,
    productCode: 'MEL-BL-18',
    productName: 'MELAMINA BLANCA 18MM',
    label: label as string,
    height: height as number,
    width: width as number,
    quantity: quantity as number,
    priority: i,
    canRotate: false,
    edges:
      (sides as string[]).length > 0
        ? { sides: sides as string[], product_id: 20, band_type: 'Soft', alias: 'BLN' }
        : null,
    ...(codes as object),
  })),
  history: [
    {
      id: 'h1',
      actor: 'client',
      actorLabel: 'María Fernanda',
      createdAt: minutesAgo(60 * 26),
      toStatus: 'confirmed',
    },
    {
      id: 'h2',
      actor: 'staff',
      actorLabel: 'Usuario E2E',
      createdAt: minutesAgo(60 * 3),
      fromStatus: 'confirmed',
      toStatus: 'queued',
    },
    {
      id: 'h3',
      actor: 'staff',
      actorLabel: 'Operador',
      createdAt: minutesAgo(95),
      fromStatus: 'queued',
      toStatus: 'in_process',
    },
  ],
  createdAt: minutesAgo(60 * 26),
  confirmedAt: minutesAgo(60 * 26),
  statusChangedAt: minutesAgo(95),
  queuedAt: minutesAgo(60 * 3),
  notes: 'Cocina edificio Norte',
  preorderId: 123,
  preorderCode: 'PRE-000123',
  isPriority: false,
  externalInvoiceId: '001-001-000004567',
  activities: [
    { type: 'cutting', status: 'in_progress', readyAt: minutesAgo(180), startedAt: minutesAgo(95) },
    { type: 'banding', status: 'pending', readyAt: minutesAgo(80) },
  ],
  paymentCashAmount: 40,
  paymentTransferAmount: 34.06,
  paymentCreditAmount: 0,
  ...overrides,
})

// --- Low-stock report ---

export const lowStockReport = (overrides: Partial<LowStockReport> = {}): LowStockReport => ({
  checked: true,
  thresholds: { board: 5, edgeBanding: 50 },
  items: [
    {
      productId: 10,
      code: 'MEL-BL-18',
      name: 'MELAMINA BLANCA 18MM',
      type: 'board',
      subtype: 'MDP',
      unit: 'sheets',
      branch: BRANCH_REF,
      available: 3,
      threshold: 5,
    },
    {
      productId: 11,
      code: 'MEL-NG-18',
      name: 'MDP MELAMÍNICO NOGAL TERRA 15MM 2150X2440',
      type: 'board',
      subtype: 'MDP',
      unit: 'sheets',
      branch: BRANCH_REF,
      available: 0,
      threshold: 5,
    },
    {
      productId: 20,
      code: 'TC-BL-19',
      name: 'TAPACANTO BLANCO 19X0.45MM',
      type: 'edge_banding',
      subtype: 'PVC',
      unit: 'linear_m',
      branch: BRANCH_REF,
      available: 32.5,
      threshold: 50,
    },
  ],
  ...overrides,
})

// --- The reports (`/analytics/*`) ---

/** The last `n` UTC days, oldest first, as the API's `buckets`. */
export const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    new Date(Date.now() - (n - 1 - i) * 24 * 60 * 60_000).toISOString().slice(0, 10),
  )

// A series that rises and falls like a month of work, not a straight line.
const wave = (n: number, base: number, amp: number) =>
  Array.from({ length: n }, (_, i) =>
    Math.round(base + amp * Math.sin(i / 3) + (i % 7) * (amp / 5)),
  )

// A branch's figures: Matriz sells and cuts more, Norte stops less — so each side leads some row.
const branchFigures = (overrides: Partial<BranchFigures> = {}): BranchFigures => ({
  branchId: 1,
  branchName: 'Matriz',
  sales: { cash: 9420.5, credit: 2680, total: 12100.5, paidOrders: 41 },
  orders: { entered: 44, finished: 39 },
  production: {
    boards: 118.5,
    cutLinearM: 3310,
    bandedLinearM: 2210.6,
    ordersBanded: 33,
    ordersAdditional: 9,
    effectiveHours: 61.4,
    pausedHours: 28.2,
    boardsPerHour: 1.93,
    metersPerHour: 53.9,
    daysWorked: 5,
    averageStartMinute: 8 * 60 + 12,
    averageEndMinute: 16 * 60 + 5,
  },
  ...overrides,
})

export const branchComparison = (): BranchComparison => ({
  range: { dateFrom: lastDays(6)[0] ?? '', dateTo: lastDays(1)[0] ?? '' },
  idleMinutes: 15,
  branches: [
    branchFigures(),
    branchFigures({
      branchId: 2,
      branchName: 'Norte',
      sales: { cash: 4210, credit: 2140.3, total: 6350.3, paidOrders: 23 },
      orders: { entered: 25, finished: 21 },
      production: {
        boards: 96,
        cutLinearM: 2760.4,
        bandedLinearM: 1874.2,
        ordersBanded: 28,
        ordersAdditional: 4,
        effectiveHours: 55.1,
        pausedHours: 17.6,
        boardsPerHour: 1.74,
        metersPerHour: 50.1,
        daysWorked: 5,
        averageStartMinute: 8 * 60 + 41,
        averageEndMinute: 15 * 60 + 58,
      },
    }),
  ],
  total: branchFigures({
    branchId: null,
    branchName: 'Total',
    sales: { cash: 13630.5, credit: 4820.3, total: 18450.8, paidOrders: 64 },
    orders: { entered: 69, finished: 60 },
    production: {
      boards: 214.5,
      cutLinearM: 6070.4,
      bandedLinearM: 4084.8,
      ordersBanded: 61,
      ordersAdditional: 13,
      effectiveHours: 116.5,
      pausedHours: 45.8,
      boardsPerHour: 1.84,
      metersPerHour: 52.11,
      daysWorked: 5,
      averageStartMinute: 8 * 60 + 26,
      averageEndMinute: 16 * 60 + 2,
    },
  }),
})

// A wall-clock time on a business day in Ecuador, as the API sends it (UTC with `Z`). Built from the
// fixed offset (UTC-5, no daylight saving), never from the runner's clock: the browser is pinned to
// America/Guayaquil (playwright.config.ts) and CI runs in UTC, so a `setHours` on the runner's
// local time drew every hour five hours early there.
const localAt = (day: string, hh: number, mm: number) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return new Date(`${day}T${pad(hh)}:${pad(mm)}:00-05:00`).toISOString()
}

export const productionReport = (days = 5): ProductionReport => {
  const dates = lastDays(days).reverse() // newest first, like the API
  return {
    range: { dateFrom: dates[dates.length - 1] ?? '', dateTo: dates[0] ?? '' },
    idleMinutes: 15,
    days: dates.flatMap((date, i) =>
      [
        { branchId: 1, branchName: 'Matriz', start: 8, end: 16 },
        { branchId: 2, branchName: 'Norte', start: 8, end: 15 },
      ].map((b) => ({
        date,
        branchId: b.branchId,
        branchName: b.branchName,
        firstEventAt: localAt(date, b.start, (i * 7 + b.branchId * 9) % 60),
        lastEventAt: localAt(date, b.end, (i * 11) % 60),
        effectiveHours: 5.2 + (i % 3) * 0.6,
        pausedHours: 2.1 + (i % 2) * 0.9,
        boards: 9.5 + i,
        cutLinearM: 260 + i * 18,
        bandedLinearM: 180 + i * 12,
        ordersBanded: 4 + (i % 2),
        ordersAdditional: i % 3,
        ordersFinished: 3 + (i % 3),
        boardsPerHour: 1.8,
        metersPerHour: 50.2,
      })),
    ),
    stops: [
      {
        branchId: 2,
        branchName: 'Norte',
        startedAt: localAt(dates[1] ?? '', 10, 2),
        endedAt: localAt(dates[1] ?? '', 12, 15),
        minutes: 133,
      },
      {
        branchId: 1,
        branchName: 'Matriz',
        startedAt: localAt(dates[0] ?? '', 12, 30),
        endedAt: localAt(dates[0] ?? '', 13, 41),
        minutes: 71,
      },
    ],
    material: [
      {
        branchId: 1,
        branchName: 'Matriz',
        averageEfficiency: 84.2,
        areaCutM2: 412.6,
        wasteEstimateM2: 65.2,
      },
      {
        branchId: 2,
        branchName: 'Norte',
        averageEfficiency: 81.4,
        areaCutM2: 355.1,
        wasteEstimateM2: 66.1,
      },
    ],
  }
}

/** The live state of the saw: Matriz cutting, Norte stopped with work waiting. */
export const productionStatus = (): ProductionStatusReport => ({
  idleMinutes: 15,
  branches: [
    {
      branchId: 1,
      branchName: 'Matriz',
      state: 'cutting',
      since: minutesAgo(95),
      lastEventAt: minutesAgo(3),
      queuedCount: 2,
      cuttingOrderCodes: ['ORD-000131'],
      banding: {
        state: 'working',
        since: minutesAgo(30),
        orderCodes: ['ORD-000128'],
        waitingCount: 1,
        lastFinishedAt: minutesAgo(120),
      },
      additional: {
        state: 'waiting',
        since: minutesAgo(40),
        orderCodes: [],
        waitingCount: 2,
        lastFinishedAt: null,
      },
    },
    {
      branchId: 2,
      branchName: 'Norte',
      state: 'stopped',
      since: minutesAgo(45),
      lastEventAt: minutesAgo(45),
      queuedCount: 3,
      cuttingOrderCodes: [],
      banding: {
        state: 'idle',
        since: minutesAgo(200),
        orderCodes: [],
        waitingCount: 0,
        lastFinishedAt: minutesAgo(200),
      },
      additional: {
        state: 'idle',
        since: null,
        orderCodes: [],
        waitingCount: 0,
        lastFinishedAt: null,
      },
    },
  ],
})

export const bottlenecksReport = (days = 31): BottlenecksData => {
  const stages: BottlenecksData['stages'] = [
    {
      key: 'queue_wait',
      label: 'Espera en cola (taller)',
      avgHours: 30.2,
      medianHours: 22.5,
      p90Hours: 61,
      sampleCount: 48,
    },
    {
      key: 'dispatch_wait',
      label: 'Espera de despacho',
      avgHours: 20.1,
      medianHours: 16,
      p90Hours: 44.5,
      sampleCount: 41,
    },
    {
      key: 'process',
      label: 'En proceso',
      avgHours: 6.8,
      medianHours: 5.5,
      p90Hours: 12.2,
      sampleCount: 47,
    },
    {
      key: 'confirm',
      label: 'Confirmación → Cola',
      avgHours: 9.4,
      medianHours: 5.25,
      p90Hours: 26,
      sampleCount: 52,
    },
    {
      key: 'cutting',
      label: 'Corte',
      avgHours: 2.4,
      medianHours: 1.75,
      p90Hours: 4.5,
      sampleCount: 47,
    },
    {
      key: 'banding',
      label: 'Canteado',
      avgHours: 1.6,
      medianHours: 1.1,
      p90Hours: 3.2,
      sampleCount: 33,
    },
    {
      key: 'additional',
      label: 'Adicionales',
      avgHours: 0,
      medianHours: 0,
      p90Hours: 0,
      sampleCount: 0,
    },
  ]
  const processOrder = [
    'confirm',
    'queue_wait',
    'process',
    'cutting',
    'banding',
    'additional',
    'dispatch_wait',
  ]
  return {
    stages,
    buckets: lastDays(days),
    // The same stages in process order, as the API sends the series.
    series: processOrder.flatMap((key) =>
      stages
        .filter((s) => s.key === key)
        .map((stage) => ({
          key: stage.key,
          label: stage.label,
          avgHours: stage.sampleCount
            ? wave(days, stage.avgHours, stage.avgHours / 3)
            : Array<number>(days).fill(0),
        })),
    ),
  }
}

export const sellerReport = (): SellerReport => ({
  sellers: [
    {
      userId: 2,
      fullName: 'Andrea Palacios',
      branchName: 'Matriz',
      paidOrders: 38,
      cash: 8760.5,
      credit: 2480,
      total: 11240.5,
      averageTicket: 295.8,
      pendingCount: 2,
      pendingAmount: 380.4,
    },
    {
      userId: 1,
      fullName: 'Usuario E2E',
      branchName: null,
      paidOrders: 26,
      cash: 4870,
      credit: 2340.3,
      total: 7210.3,
      averageTicket: 277.3,
      pendingCount: 0,
      pendingAmount: 0,
    },
  ],
  total: {
    paidOrders: 64,
    cash: 13630.5,
    credit: 4820.3,
    total: 18450.8,
    averageTicket: 288.29,
    pendingCount: 2,
    pendingAmount: 380.4,
  },
})

export const operatorReport = (): OperatorReport => ({
  idleMinutes: 15,
  operators: [
    {
      userId: 3,
      fullName: 'Carlos Guamán',
      branchName: 'Matriz',
      piecesCut: 412,
      boards: 118.5,
      cutLinearM: 3310,
      effectiveHours: 61.4,
      boardsPerHour: 1.93,
      metersPerHour: 53.9,
      ordersCut: 31,
    },
    {
      userId: 4,
      fullName: 'Luis Morocho Tenesaca',
      branchName: 'Norte',
      piecesCut: 288,
      boards: 96,
      cutLinearM: 2760.4,
      effectiveHours: 55.1,
      boardsPerHour: 1.74,
      metersPerHour: 50.1,
      ordersCut: 22,
    },
    {
      // The work of a user deleted since: listed, so the total matches the Resumen.
      userId: null,
      fullName: 'Sin usuario',
      branchName: null,
      piecesCut: 0,
      boards: 0,
      cutLinearM: 0,
      effectiveHours: 0,
      boardsPerHour: 0,
      metersPerHour: 0,
      ordersCut: 0,
    },
  ],
  total: {
    piecesCut: 700,
    boards: 214.5,
    cutLinearM: 6070.4,
    effectiveHours: 116.5,
    boardsPerHour: 1.84,
    metersPerHour: 52.11,
    ordersCut: 53,
  },
})

// Carlos's sheets: two that count, one Luis closed and one still missing a piece.
export const operatorBoards = (): OperatorBoardsReport => {
  const [today = '', yesterday = ''] = lastDays(2).reverse()
  const sheet = (overrides: Partial<OperatorBoard>): OperatorBoard => ({
    boardId: 1,
    orderId: 131,
    orderCode: 'ORD-000131',
    clientName: 'Carpintería Andes',
    branchName: 'Matriz',
    sheetNumber: 1,
    materialName: 'MDP BLANCO 15 MM',
    width: 2440,
    height: 2140,
    kind: 'whole',
    weight: 1,
    day: today,
    piecesTotal: 12,
    piecesMine: 12,
    piecesMineInRange: 12,
    piecesByOthers: 0,
    piecesPending: 0,
    otherCutters: [],
    myLastCutAt: localAt(today, 10, 5),
    doneAt: localAt(today, 10, 5),
    closedBy: 'Carlos Guamán',
    status: 'credited',
    ...overrides,
  })
  return {
    userId: 3,
    fullName: 'Carlos Guamán',
    boards: 1.5,
    creditedCount: 2,
    piecesCut: 29,
    sheets: [
      sheet({
        boardId: 4,
        sheetNumber: 4,
        piecesMine: 3,
        piecesMineInRange: 3,
        piecesPending: 9,
        myLastCutAt: localAt(today, 11, 40),
        doneAt: null,
        closedBy: null,
        status: 'incomplete',
      }),
      sheet({ boardId: 1 }),
      sheet({
        boardId: 2,
        sheetNumber: 2,
        kind: 'half',
        weight: 0.5,
        width: 1220,
        day: yesterday,
        piecesTotal: 6,
        piecesMine: 6,
        piecesMineInRange: 6,
        myLastCutAt: localAt(yesterday, 15, 20),
        doneAt: localAt(yesterday, 15, 20),
      }),
      sheet({
        boardId: 3,
        sheetNumber: 3,
        day: yesterday,
        piecesMine: 8,
        piecesMineInRange: 8,
        piecesByOthers: 4,
        otherCutters: ['Luis Morocho Tenesaca'],
        myLastCutAt: localAt(yesterday, 14, 2),
        doneAt: localAt(yesterday, 14, 30),
        closedBy: 'Luis Morocho Tenesaca',
        status: 'credited_to_other',
      }),
    ],
  }
}

// Andrea's orders: one paid today, one confirmed in an earlier month and paid yesterday (the sale
// that moves), and one still to collect.
export const sellerOrders = (): SellerOrdersReport => {
  const [today = '', yesterday = ''] = lastDays(2).reverse()
  return {
    userId: 2,
    fullName: 'Andrea Palacios',
    figures: {
      paidOrders: 2,
      cash: 260,
      credit: 120,
      total: 380,
      averageTicket: 190,
      pendingCount: 1,
      pendingAmount: 75.5,
    },
    paid: [
      {
        orderId: 131,
        orderCode: 'ORD-000131',
        clientName: 'Carpintería Andes',
        branchName: 'Matriz',
        createdAt: localAt(today, 9, 15),
        paidAt: localAt(today, 10, 5),
        day: today,
        cash: 200,
        transfer: 0,
        credit: 0,
        total: 200,
        invoice: '001-002-000123',
      },
      {
        orderId: 120,
        orderCode: 'ORD-000120',
        clientName: 'Muebles Paute',
        branchName: 'Matriz',
        createdAt: '2026-08-28T15:00:00Z',
        paidAt: localAt(yesterday, 16, 40),
        day: yesterday,
        cash: 40,
        transfer: 20,
        credit: 120,
        total: 180,
        invoice: null,
      },
    ],
    pending: [
      {
        orderId: 140,
        orderCode: 'ORD-000140',
        clientName: 'Cocinas del Sur',
        branchName: 'Matriz',
        confirmedAt: localAt(yesterday, 11, 0),
        total: 75.5,
      },
    ],
  }
}

// Rosa's work: a clocked banding, one tapped in after the work and an additional one.
export const banderOrders = (): BanderOrdersReport => {
  const [today = ''] = lastDays(1)
  return {
    userId: 5,
    fullName: 'Rosa Quizhpi',
    figures: {
      ordersBanded: 2,
      ordersBandedUnclocked: 1,
      bandingHours: 2,
      bandedLinearM: 42.2,
      bandingMetersPerHour: 13.62,
      averageBandingHours: 2,
      ordersAdditional: 1,
      ordersAdditionalUnclocked: 0,
      additionalHours: 0.5,
      averageAdditionalHours: 0.5,
    },
    orders: [
      {
        orderId: 131,
        orderCode: 'ORD-000131',
        clientName: 'Carpintería Andes',
        branchName: 'Matriz',
        kind: 'additional',
        startedAt: localAt(today, 16, 0),
        finishedAt: localAt(today, 16, 30),
        day: today,
        hours: 0.5,
        bandedLinearM: 0,
      },
      {
        orderId: 131,
        orderCode: 'ORD-000131',
        clientName: 'Carpintería Andes',
        branchName: 'Matriz',
        kind: 'banding',
        startedAt: localAt(today, 15, 40),
        finishedAt: localAt(today, 15, 40),
        day: today,
        hours: null,
        bandedLinearM: 15,
      },
      {
        orderId: 128,
        orderCode: 'ORD-000128',
        clientName: 'Muebles Paute',
        branchName: 'Matriz',
        kind: 'banding',
        startedAt: localAt(today, 9, 0),
        finishedAt: localAt(today, 11, 0),
        day: today,
        hours: 2,
        bandedLinearM: 27.2,
      },
    ],
  }
}

export const banderReport = (): BanderReport => ({
  banders: [
    {
      userId: 5,
      fullName: 'Rosa Quizhpi',
      branchName: 'Matriz',
      ordersBanded: 22,
      ordersBandedUnclocked: 13,
      bandingHours: 17.5,
      bandedLinearM: 812.4,
      bandingMetersPerHour: 46.42,
      averageBandingHours: 0.8,
      ordersAdditional: 4,
      ordersAdditionalUnclocked: 3,
      additionalHours: 3.2,
      averageAdditionalHours: 0.8,
    },
  ],
  total: {
    ordersBanded: 22,
    ordersBandedUnclocked: 13,
    bandingHours: 17.5,
    bandedLinearM: 812.4,
    bandingMetersPerHour: 46.42,
    averageBandingHours: 0.8,
    ordersAdditional: 4,
    ordersAdditionalUnclocked: 3,
    additionalHours: 3.2,
    averageAdditionalHours: 0.8,
  },
})

// First logins at a local time: `firstLoginAt` is UTC naive, so the local hour is shifted back.
const loginAt = (day: string, hh: number, mm: number) => {
  const d = new Date(`${day}T00:00:00`)
  d.setHours(hh, mm)
  return d.toISOString().slice(0, 19)
}

export const attendanceReport = (days = 12): AttendanceData => {
  const dates = lastDays(days)
  const person = (userId: number, fullName: string, roles: Role[], lateEvery: number) => ({
    userId,
    fullName,
    roles,
    branchName: 'Matriz',
    days: dates
      .filter((_, i) => (i + userId) % 6 !== 0)
      .map((date, i) => ({
        date,
        firstLoginAt: loginAt(date, i % lateEvery === 0 ? 8 : 7, (i * 7 + userId * 11) % 60),
        loginCount: i % 4 === 0 ? 2 : 1,
      })),
  })
  return {
    users: [
      person(2, 'Andrea Palacios', ['vendedor'], 5),
      person(3, 'Carlos Guamán', ['operador'], 4),
      person(4, 'Luis Morocho Tenesaca', ['operador', 'canteador'], 9),
    ],
  }
}

// --- The order's cutting plan (the canvas and the detail's progress) ---

/** `GET /orders/:id/cutting-plan` for `order()`: the plan above, seven pieces of nine cut. */
export const cuttingPlan = (overrides: Partial<CuttingPlan> = {}): CuttingPlan => {
  const pieces: CutPiece[] = PLAN_PIECES.map((p, i) => ({
    ...p,
    id: i + 1,
    label: p.pieceId.replace(/#\d+$/, ''),
    cut: i < 7,
    cutAt: i < 7 ? minutesAgo(90 - i * 10) : null,
    cutByLabel: i < 7 ? 'Operador' : null,
    ...planCodes(p.pieceId),
  }))
  return {
    orderId: 41,
    orderCode: 'ORD-000041',
    status: 'in_process',
    client: client({ firstName: 'María Fernanda', lastName: 'Villavicencio Ortega' }),
    notes: 'Cocina edificio Norte',
    progress: { cutPieces: 7, totalPieces: pieces.length },
    activities: [
      {
        type: 'cutting',
        status: 'in_progress',
        readyAt: minutesAgo(180),
        startedAt: minutesAgo(95),
        progress: { cutPieces: 7, totalPieces: pieces.length },
      },
      { type: 'banding', status: 'pending', readyAt: minutesAgo(80) },
    ],
    boards: [
      {
        id: 1,
        sheetNumber: 1,
        materialKey: 'mat-e2e',
        productCode: 'MDF-BL-RAN-15',
        // A real catalogue name, of the long kind: the 20-character one this used to carry hid that
        // the canvas truncated the material on a phone.
        productName: 'MDF BLANCO RANURADO 2C (2.44X2.15)M-15MM',
        width: 2150,
        height: 2440,
        thickness: 15,
        progress: { cutPieces: 7, totalPieces: pieces.length },
        pieces,
        remainders: PLAN_LAYOUT.remainders,
        cuts: [],
      },
    ],
    printLabelsEnabled: false,
    ...overrides,
  }
}

/** `POST /inventory/stock-check`: the branch holds less of the board than the quote needs. */
export const stockCheck = (overrides: Partial<StockCheckResult> = {}): StockCheckResult => ({
  branch: BRANCH_REF,
  checked: true,
  alerts: [
    {
      productId: 10,
      productCode: 'MEL-BL-18',
      productName: 'MELAMINA BLANCA 18MM',
      type: 'board',
      unit: 'sheets',
      required: 1,
      available: 3,
      threshold: 5,
      belowThreshold: true,
      insufficient: false,
    },
  ],
  ...overrides,
})
