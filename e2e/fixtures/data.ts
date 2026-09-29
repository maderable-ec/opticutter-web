import type { User } from 'src/features/auth/types'
import type { Branch } from 'src/features/branches/types'
import type { Client } from 'src/features/clients/types'
import type { OptimizeResponse, UnplacedPiece } from 'src/features/optimizer/types'
import type { WorkshopQueueItem } from 'src/features/orders/types'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import type { ReviewPreOrder } from 'src/features/review/types'

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
