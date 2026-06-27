import type { Client } from 'src/features/clients/types'
import type { BranchRef } from 'src/features/branches/types'
import type { PlacedPieceEdges, Remainder } from 'src/features/optimizer/types'

export type OrderStatus = 'confirmed' | 'queued' | 'cutting' | 'cut' | 'completed' | 'despachado' | 'cancelled'

// Pista de canteado (tapacantos), ortogonal al corte: una orden puede estar `cutting` y
// `bandingStatus: 'in_progress'` a la vez. `not_applicable` = la orden no lleva tapacantos.
export type BandingStatus = 'not_applicable' | 'pending' | 'in_progress' | 'done'

export interface OrderLine {
  id: string
  productCode: string
  productName: string
  quantity: number
  unitPriceSnapshot: number
  lineTotal: number
  avgEfficiency?: number
  totalAreaM2?: number
}

export interface OrderHistoryEntry {
  id: string
  // Auditoría (PR #39): `actor` es el TIPO de quien actuó, no un nombre libre.
  actor?: 'staff' | 'client' | 'system'
  actorUserId?: number | null
  actorLabel?: string | null // nombre congelado del actor al momento de la acción
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
  // Sucursal dueña (FK obligatoria): siempre presente en listado y detalle.
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
  // Pista de canteado (paralela al corte). Los `*Label` son nombres congelados al momento de la
  // acción (mismo patrón que `assignedToLabel`).
  bandingStatus?: BandingStatus
  bandingStartedAt?: string | null
  bandingStartedBy?: number | null
  bandingStartedByLabel?: string | null
  bandingFinishedAt?: string | null
  bandingFinishedBy?: number | null
  bandingFinishedByLabel?: string | null
  // Despacho: congelados en la transición completed → despachado.
  dispatchedAt?: string
  dispatchedBy?: number
  dispatchedByLabel?: string
}

export interface OrderListParams {
  // Uno o varios estados; con varios el backend recibe `status` repetido (?status=a&status=b).
  status?: OrderStatus | OrderStatus[]
  // Filtro efectivo para roles globales (admin y vendedor); el operador queda acotado a su sucursal.
  branchId?: number
  offset?: number
  limit?: number
}

export interface UpdateStatusPayload {
  status: OrderStatus
  note?: string
}

// --- Canteado ---
// El cuerpo del PATCH avanza la pista forward-only (pending → in_progress → done).
export interface BandingPayload {
  status: 'in_progress' | 'done'
  note?: string
}

// Respuesta del PATCH /orders/{id}/banding (subconjunto: sin precios ni piezas).
export interface BandingResult {
  orderId: number
  orderCode: string
  bandingStatus: BandingStatus
  bandingStartedAt: string | null
  bandingFinishedAt: string | null
}

// Una orden en la cola de canteado (GET /orders/banding-queue). Sin precios ni detalle de piezas;
// solo lo necesario para identificarla físicamente y mostrar su estado.
export interface BandingQueueItem {
  orderId: number
  orderCode: string
  status: OrderStatus
  bandingStatus: Extract<BandingStatus, 'pending' | 'in_progress'>
  createdAt: string
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

// --- Plan de corte (vista de taller) ---
// Llega ya expandido por tablero físico desde GET /orders/{id}/cutting-plan; cada pieza trae su `id`
// persistente para marcarla y la misma geometría que `placedPieces` del optimizador.

export interface CutProgress {
  cutPieces: number
  totalPieces: number
}

// Una pieza física dentro de un tablero. La geometría es idéntica a PlacedPiece (optimizer); además
// trae el estado de corte. `id` (numérico) es el identificador persistente para el PATCH; `pieceId`
// (`label#N`) es la identidad legible de la instancia.
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
  // Auditoría (PR #39): quién marcó la pieza como cortada.
  cutBy?: number | null
  cutByLabel?: string | null
}

// Un recorrido real de la sierra (guillotina) calculado por el optimizador: nace en (x, y) y corre
// `length` mm en horizontal (isHorizontal: true, hacia +x) o vertical (false, hacia +y). No se infiere
// en el front: requeriría kerf/trims/regla de partición que no viajan en la respuesta.
export interface BoardCut {
  x: number
  y: number
  length: number
  isHorizontal: boolean
}

// Un tablero físico real (una hoja). `sheetNumber` es secuencial 1..N en toda la orden; dos hojas
// idénticas aparecen dos veces (sin deduplicar por patrón).
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
  // Rectángulos sobrantes del tablero (misma forma que en el optimizador), para distinguir pieza vs.
  // sobrante. Opcionales por compatibilidad con respuestas previas al cambio de contrato.
  remainders?: Remainder[]
  // Recorridos de la sierra de punta a punta (guía principal contra la confusión en guillotina).
  cuts?: BoardCut[]
}

export interface CuttingPlan {
  orderId: number
  orderCode: string
  status: OrderStatus
  progress: CutProgress
  boards: CutBoard[]
}

// Respuesta del PATCH de marcado: pieza actualizada + avance recalculado (global y del tablero).
export interface MarkPieceResponse {
  piece: CutPiece
  progress: CutProgress
  boardProgress: CutProgress
}
