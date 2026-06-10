import type { OrderStatus } from 'src/features/orders/types'

export interface ReviewLine {
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  linearM?: number
}

// Edge banding info on a piece; keys arrive in snake_case from the server.
export interface ReviewEdges {
  sides?: string[]
  band_type?: string
}

// A cut-list piece on the public review (not billed per piece).
export interface ReviewPiece {
  label?: string
  height?: number
  width?: number
  quantity?: number
  edges?: ReviewEdges | null
}

export interface ReviewData {
  orderCode: string
  clientName: string
  currency: string
  status: OrderStatus
  total: number
  expiresAt?: string
  confirmedAt?: string
  lines: ReviewLine[]
  pieces?: ReviewPiece[]
}
