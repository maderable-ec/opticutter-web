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

// Payload to create a quote/order. The cut-list is sent as `materials` + `requirements`
// (built by the optimizer feature); those travel through the index signature.
export interface OrderCreatePayload {
  clientId?: number
  pieces?: OrderPiece[]
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
