export type ReviewPreOrderStatus =
  | 'draft'
  | 'sent'
  | 'changes_requested'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'

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
  materialCode?: string | null
  materialName?: string | null
  height?: number
  width?: number
  quantity?: number
  edges?: ReviewEdges | null
}

// A billed additional service (e.g. ensamble, corte) on the public review.
export interface ReviewService {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface ReviewPreOrder {
  reference: string // pre-order code (PRE-…), displayed as the document reference
  status: ReviewPreOrderStatus
  orderCode: string | null // null until confirmed; "ORD-…" after confirmation
  clientName: string
  clientNote: string | null // note written by the client when requesting changes
  currency: string
  subtotal: number
  priceTierName?: string
  discountRate?: number
  discountAmount?: number
  servicesTotal?: number
  total: number
  totalBoardsUsed: number
  createdAt: string
  sentAt: string | null
  confirmedAt: string | null
  expiresAt: string | null
  lines: ReviewLine[]
  additionalServices?: ReviewService[]
  pieces: ReviewPiece[]
}
