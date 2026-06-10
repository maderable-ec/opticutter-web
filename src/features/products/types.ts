export type ProductType = 'board' | 'edge_banding'

export interface BoardAttributes {
  height?: number
  width?: number
  thickness?: number
  grainDirection?: string
}

export interface EdgeBandingAttributes {
  thickness?: number
  width?: number
  length?: number
  bandType?: string
  color?: string
}

interface ProductBase {
  id: string
  code: string
  name: string
  description?: string | null
  price: number
  isActive: boolean
}

export interface BoardProduct extends ProductBase {
  type: 'board'
  attributes: BoardAttributes
}

export interface EdgeBandingProduct extends ProductBase {
  type: 'edge_banding'
  attributes: EdgeBandingAttributes
}

/** Discriminated union on `type` — narrow with `product.type === 'board'`. */
export type Product = BoardProduct | EdgeBandingProduct

export interface ProductListParams {
  type?: ProductType
  search?: string
  offset?: number
  limit?: number
}

export interface ProductPayload {
  code: string
  name: string
  description?: string | null
  type: ProductType
  price: number
  isActive?: boolean
  attributes: BoardAttributes | EdgeBandingAttributes
}
