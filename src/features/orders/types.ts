import type { Client } from 'src/features/clients/types'

export type OrderStatus =
  | 'draft'
  | 'quoted'
  | 'confirmed'
  | 'approved'
  | 'in_production'
  | 'cut'
  | 'completed'
  | 'cancelled'
  | 'expired'

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
  actor?: string
  createdAt: string
  fromStatus?: OrderStatus
  toStatus: OrderStatus
  note?: string
}

// A cut-list piece on an order. Shape is broad until the create flow is fully typed.
export interface OrderPiece {
  id?: string
  [key: string]: unknown
}

export interface Order {
  id: string
  code: string
  status: OrderStatus
  total: number
  client: Client
  lines: OrderLine[]
  pieces?: OrderPiece[]
  history?: OrderHistoryEntry[]
  createdAt: string
  expiresAt?: string
  confirmedAt?: string
  externalInvoiceId?: string
}

export interface OrderListParams {
  status?: OrderStatus
  offset?: number
  limit?: number
}

export interface UpdateStatusPayload {
  status: OrderStatus
  note?: string
}

export interface AssociateInvoicePayload {
  externalInvoiceId: string
  [key: string]: unknown
}

// Payload to create a quote/order. Refined as OrderCreatePage is typed.
export interface OrderCreatePayload {
  clientId?: string
  pieces?: OrderPiece[]
  [key: string]: unknown
}

export interface OptimizeMaterial {
  materialKey: string
  productCode: string
  productName: string
  count: number
  totalCost: number
  avgEfficiency?: number
}

export interface OptimizeResult {
  totalBoardsUsed: number
  totalBoardsCost?: number
  totalEdgeBandingCost?: number
  totalCutLinearM?: number
  materialsSummary: OptimizeMaterial[]
}

export interface ReviewLinkInfo {
  status: string
  url?: string
  token?: string
  expiresAt?: string
}
