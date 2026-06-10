export interface ReviewLine {
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  linearM?: number
}

export interface ReviewData {
  orderCode: string
  clientName: string
  currency: string
  status: string
  total: number
  expiresAt?: string
  confirmedAt?: string
  lines: ReviewLine[]
  pieces?: unknown[]
}
