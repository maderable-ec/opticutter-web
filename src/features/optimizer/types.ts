import type { Client } from 'src/features/clients/types'

// Tipos de la respuesta de POST /api/v1/optimize/. El contrato es determinista y cacheado por
// hash del input; ver la spec del endpoint para detalles de cada campo.

export type MaterialSourceKind = 'catalog' | 'companyOffcut' | 'clientOffcut' | 'manual'

export type EdgeSide = 'top' | 'bottom' | 'left' | 'right'

// El material físico de una hoja, tal como vuelve en cada Layout.
export interface OptimizeMaterialSheet {
  materialKey: string
  sheetNumber: number
  height: number
  width: number
  thickness: number
  area: number
}

export interface PlacedPieceEdge {
  productId: number
  productCode: string
  productName: string
}

export interface PlacedPiece {
  pieceId: string
  x: number
  y: number
  height: number
  width: number
  rotated: boolean
  originalHeight: number
  originalWidth: number
  // Lados con tapacanto, en espacio geométrico (post-rotación). Puede ser null.
  edges?: Partial<Record<EdgeSide, PlacedPieceEdge>> | null
}

export interface Remainder {
  x: number
  y: number
  height: number
  width: number
}

export interface LayoutStatistics {
  usedArea: number
  wasteArea: number
  efficiency: number
  piecesCount: number
  cutLinearM: number
  edgeBandingLinearM: number
}

export interface Layout {
  material: OptimizeMaterialSheet
  placedPieces: PlacedPiece[]
  statistics: LayoutStatistics
  remainders: Remainder[]
}

export interface MaterialSummary {
  materialKey: string
  source: MaterialSourceKind
  productId?: number
  productCode?: string
  productName?: string
  height: number
  width: number
  thickness: number
  count: number
  totalAreaM2: number
  avgEfficiency: number
  costPerUnit: number
  totalCost: number
}

export interface EdgeBandingSummary {
  productId: number
  productCode: string
  productName: string
  thickness: number
  color?: string
  netLinearM: number
  linearM: number
  billedLinearM: number
  pricePerM: number
  totalCost: number
}

// Agrupa hojas con el mismo patrón de corte (deduplicado para el diagrama).
export interface LayoutGroup {
  patternId: number
  count: number
  sheetNumbers: number[]
  materialKey: string
  layout: Layout
}

export interface OptimizeResponse {
  id: null
  client: Client | null
  optimizationHash: string | null
  totalBoardsUsed: number
  totalBoardsCost?: number
  totalEdgeBandingCost?: number
  totalCutLinearM?: number
  totalEdgeBandingLinearM?: number
  layouts: Layout[]
  materialsSummary: MaterialSummary[]
  edgeBandingsSummary: EdgeBandingSummary[]
  layoutGroups: LayoutGroup[]
}

// --- Inputs del request (lo que envía el frontend) ---

export interface CatalogMaterialInput {
  key: string
  source: 'catalog'
  productId: number
}

export interface InlineMaterialInput {
  key: string
  source: Exclude<MaterialSourceKind, 'catalog'>
  height: number
  width: number
  thickness: number
  costPerUnit?: number
  label?: string
}

export type MaterialInput = CatalogMaterialInput | InlineMaterialInput

export interface EdgeBandingSpec {
  productId: number
  sides: EdgeSide[]
}

export interface RequirementInput {
  materialKey: string
  height: number
  width: number
  quantity: number
  priority: number
  label?: string
  canRotate: boolean
  edgeBanding?: EdgeBandingSpec
}

export interface OptimizePayload {
  materials: MaterialInput[]
  requirements: RequirementInput[]
  clientId?: number
}
