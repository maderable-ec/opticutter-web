import type { User } from 'src/features/auth/types'
import type { Branch, BranchRef } from 'src/features/branches/types'
import type { Client } from 'src/features/clients/types'
import type {
  AnalyticsSummary,
  AttendanceData,
  BottlenecksData,
  StatusBreakdownData,
  Timeseries,
  UserProductivity,
  UsersProductivityData,
} from 'src/features/analytics/types'
import type { LowStockReport, StockCheckResult } from 'src/features/inventory/types'
import type {
  Layout,
  OptimizeResponse,
  PlacedPiece,
  UnplacedPiece,
} from 'src/features/optimizer/types'
import type { CutPiece, CuttingPlan, Order, WorkshopQueueItem } from 'src/features/orders/types'
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

const PLAN_LAYOUT: Layout = {
  material: {
    materialKey: 'mat-e2e',
    sheetNumber: 1,
    height: 2440,
    width: 2150,
    thickness: 18,
    area: 5.246,
  },
  placedPieces: PLAN_PIECES,
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

export const analyticsSummary = (overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary => ({
  orderCount: 64,
  realizedRevenue: 18450.3,
  averageTicket: 288.29,
  activeClientsCount: 41,
  pendingOrdersCount: 9,
  cancellationRate: 0.047,
  totalBoardsConsumed: 212,
  totalAreaCutM2: 781.4,
  wasteEstimateM2: 132.8,
  averageEfficiency: 83.6,
  ...overrides,
})

export const analyticsTimeseries = (days = 31): Timeseries => ({
  buckets: lastDays(days),
  series: {
    revenue: wave(days, 600, 250),
    orderCount: wave(days, 2, 1),
    boardsConsumed: wave(days, 7, 3),
    newClients: wave(days, 1, 1),
  },
})

export const statusBreakdown = (): StatusBreakdownData => ({
  items: [
    { key: 'confirmed', label: 'Confirmada', orderCount: 5, revenue: 1310 },
    { key: 'queued', label: 'En cola', orderCount: 3, revenue: 870 },
    { key: 'in_process', label: 'En proceso', orderCount: 4, revenue: 1502 },
    { key: 'finished', label: 'Terminada', orderCount: 6, revenue: 1730 },
    { key: 'dispatched', label: 'Despachada', orderCount: 43, revenue: 12410 },
    { key: 'cancelled', label: 'Cancelada', orderCount: 3, revenue: 628 },
  ],
})

/** Every branch, keyed by id as the API keys them. */
export const branchBreakdown = (): StatusBreakdownData => ({
  items: [
    { key: '1', label: 'Matriz', orderCount: 41, revenue: 12100 },
    { key: '2', label: 'Norte', orderCount: 23, revenue: 6350 },
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

const productivity = (overrides: Partial<UserProductivity>): UserProductivity => ({
  userId: 1,
  fullName: 'Usuario',
  roles: ['operador'],
  branchName: 'Matriz',
  piecesCut: 0,
  areaCutM2: 0,
  ordersCut: 0,
  cuttingHours: 0,
  piecesPerHour: 0,
  boardsCut: 0,
  ordersBanded: 0,
  bandingHours: 0,
  ordersCreated: 0,
  revenueGenerated: 0,
  ...overrides,
})

export const productivityReport = (): UsersProductivityData => ({
  users: [
    productivity({
      userId: 3,
      fullName: 'Carlos Guamán',
      piecesCut: 412,
      areaCutM2: 96.4,
      ordersCut: 31,
      cuttingHours: 38.5,
      piecesPerHour: 10.7,
      boardsCut: 118,
    }),
    productivity({
      userId: 4,
      fullName: 'Luis Morocho Tenesaca',
      roles: ['operador', 'canteador'],
      piecesCut: 188,
      areaCutM2: 41.2,
      ordersCut: 14,
      cuttingHours: 20.25,
      piecesPerHour: 9.28,
      boardsCut: 52,
      ordersBanded: 22,
      bandingHours: 17.5,
    }),
    productivity({
      userId: 2,
      fullName: 'Andrea Palacios',
      roles: ['vendedor'],
      ordersCreated: 38,
      revenueGenerated: 11240.5,
    }),
    productivity({
      userId: 1,
      fullName: 'Usuario E2E',
      roles: ['administrador'],
      branchName: null,
      ordersCreated: 26,
      revenueGenerated: 7209.8,
    }),
  ],
})

// First logins at a local time: `firstLoginAt` is UTC naive, so the local hour is shifted back.
const loginAt = (day: string, hh: number, mm: number) => {
  const d = new Date(`${day}T00:00:00`)
  d.setHours(hh, mm)
  return d.toISOString().slice(0, 19)
}

export const attendanceReport = (days = 12): AttendanceData => {
  const dates = lastDays(days)
  const person = (
    userId: number,
    fullName: string,
    roles: UserProductivity['roles'],
    lateEvery: number,
  ) => ({
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
  const codes: Record<string, Partial<CutPiece>> = {
    Lateral: { hingingCode: 'B2' },
    Puerta: { hingingCode: 'B2' },
    Fondo: { groovingCode: 'R1' },
  }
  const pieces: CutPiece[] = PLAN_PIECES.map((p, i) => ({
    ...p,
    id: i + 1,
    label: p.pieceId.replace(/#\d+$/, ''),
    cut: i < 7,
    cutAt: i < 7 ? minutesAgo(90 - i * 10) : null,
    cutByLabel: i < 7 ? 'Operador' : null,
    ...codes[p.pieceId.replace(/#\d+$/, '')],
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
