import type { Client } from 'src/features/clients/types'
import type { BranchRef } from 'src/features/branches/types'
import type { PlacedPieceEdges, Remainder } from 'src/features/optimizer/types'

export type OrderStatus =
  | 'confirmed'
  | 'queued'
  | 'cutting'
  | 'cut'
  | 'completed'
  | 'despachado'
  | 'cancelled'

// Banding track (edge banding), orthogonal to cutting: an order can be `cutting` and
// `bandingStatus: 'in_progress'` simultaneously. `not_applicable` = order has no edge banding.
export type BandingStatus = 'not_applicable' | 'pending' | 'in_progress' | 'done'

// Order attachment (anexo): PDF/PNG/JPEG uploaded against an order.
export interface Attachment {
  id: number
  filename: string
  contentType: string
  sizeBytes: number
  createdAt: string
  createdBy: number | null
}

export interface OrderLine {
  id: string
  productCode: string
  productName: string
  quantity: number
  unitPriceSnapshot: number
  lineTotal: number
  avgEfficiency?: number
  totalAreaM2?: number
  halfBoard?: boolean
}

export interface OrderHistoryEntry {
  id: string
  // `actor` is the TYPE of the entity that acted, not a free-form name.
  actor?: 'staff' | 'client' | 'system'
  actorUserId?: number | null
  actorLabel?: string | null // actor's display name frozen at the time of the action
  createdAt: string
  fromStatus?: OrderStatus
  toStatus: OrderStatus
  note?: string
}

// A cut-list piece on an order, as returned by the server.
export interface OrderPiece {
  id?: string
  label?: string
  height?: number
  width?: number
  quantity?: number
  priority?: number
  canRotate?: boolean
  [key: string]: unknown
}

export interface Order {
  id: string
  code: string
  status: OrderStatus
  subtotal?: number
  total: number
  priceTierCode?: string
  priceTierName?: string
  discountRate?: number
  discountAmount?: number
  client: Client
  // Owning branch (mandatory FK): always present in list and detail responses.
  branch: BranchRef
  lines: OrderLine[]
  pieces?: OrderPiece[]
  history?: OrderHistoryEntry[]
  createdAt: string
  confirmedAt?: string
  externalInvoiceId?: string
  assignedToId?: number | null
  assignedAt?: string | null
  assignedToLabel?: string | null
  // Banding track (parallel to cutting). `*Label` fields are names frozen at the time of the action
  // (same pattern as `assignedToLabel`).
  bandingStatus?: BandingStatus
  bandingStartedAt?: string | null
  bandingStartedBy?: number | null
  bandingStartedByLabel?: string | null
  bandingFinishedAt?: string | null
  bandingFinishedBy?: number | null
  bandingFinishedByLabel?: string | null
  // Dispatch: fields frozen at the completed → despachado transition.
  dispatchedAt?: string
  dispatchedBy?: number
  dispatchedByLabel?: string
  // Payment: fields frozen at the confirmed → queued transition.
  paymentCashAmount?: number | null
  paymentCreditAmount?: number | null
}

export interface OrderListParams {
  // One or more statuses; with multiple the backend receives repeated `status` params (?status=a&status=b).
  status?: OrderStatus | OrderStatus[]
  // Effective filter for global roles (admin and vendedor); operador is implicitly scoped to their branch.
  branchId?: number
  offset?: number
  limit?: number
}

export interface UpdateStatusPayload {
  status: OrderStatus
  note?: string
  payment?: { cashAmount?: number; creditAmount?: number }
}

// --- Banding ---
// PATCH body advances the track forward-only (pending → in_progress → done).
export interface BandingPayload {
  status: 'in_progress' | 'done'
  note?: string
}

// Response from PATCH /orders/{id}/banding (subset: no prices or pieces).
export interface BandingResult {
  orderId: number
  orderCode: string
  bandingStatus: BandingStatus
  bandingStartedAt: string | null
  bandingFinishedAt: string | null
}

// An order in the shared workshop board (GET /orders/workshop-queue), used by operador,
// canteador, and administrador. Distinct board names are in first-appearance order, falling
// back to product code then raw materialKey for boards outside the catalog.
export interface WorkshopQueueItem {
  orderId: number
  orderCode: string | null
  status: Extract<OrderStatus, 'queued' | 'cutting' | 'cut'>
  bandingStatus: BandingStatus
  createdAt: string
  client: Client
  boardNames: string[]
  progress: CutProgress
}

export interface AssociateInvoicePayload {
  externalInvoiceId: string
  [key: string]: unknown
}

export interface ReviewLinkInfo {
  status: string
  url?: string
  token?: string
  createdAt?: string
  expiresAt?: string
  usedAt?: string
}

// --- Cutting plan (workshop view) ---
// Returned already expanded by physical board from GET /orders/{id}/cutting-plan; each piece carries
// its persistent `id` for marking and the same geometry as `placedPieces` in the optimizer.

export interface CutProgress {
  cutPieces: number
  totalPieces: number
}

// A physical piece within a board. Geometry is identical to PlacedPiece (optimizer); additionally
// carries the cut state. `id` (numeric) is the persistent identifier for PATCH; `pieceId`
// (`label#N`) is the human-readable instance identity.
export interface CutPiece {
  id: number
  pieceId: string
  label: string
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  rotated: boolean
  edges?: PlacedPieceEdges | null
  cut: boolean
  cutAt: string | null
  // Who marked the piece as cut.
  cutBy?: number | null
  cutByLabel?: string | null
}

// An actual saw (guillotine) cut path calculated by the optimizer: starts at (x, y) and runs
// `length` mm horizontally (isHorizontal: true, toward +x) or vertically (false, toward +y).
// Not inferred client-side: it would require kerf/trims/partition rules not included in the response.
export interface BoardCut {
  x: number
  y: number
  length: number
  isHorizontal: boolean
}

// A real physical board (one sheet). `sheetNumber` is sequential 1..N across the whole order;
// identical sheets appear twice (not deduplicated by pattern).
export interface CutBoard {
  id: number
  sheetNumber: number
  materialKey: string
  productCode: string
  productName: string
  width: number
  height: number
  thickness: number
  progress: CutProgress
  pieces: CutPiece[]
  halfBoard?: boolean
  // Leftover rectangles on the board (same shape as in the optimizer), to distinguish piece vs. waste.
  // Optional for backward compatibility with responses before the contract change.
  remainders?: Remainder[]
  // Full saw-path cuts end-to-end (primary aid against guillotine confusion in the workshop).
  cuts?: BoardCut[]
}

export interface CuttingPlan {
  orderId: number
  orderCode: string
  status: OrderStatus
  progress: CutProgress
  boards: CutBoard[]
}

// Response from the mark PATCH: updated piece + recalculated progress (global and per board).
export interface MarkPieceResponse {
  piece: CutPiece
  progress: CutProgress
  boardProgress: CutProgress
}
