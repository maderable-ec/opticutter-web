import type { EdgeSide } from 'src/shared/utils/cutDrawing'

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

// Edge banding on a cut-list piece. No rotation here — the server sends the
// requirement's own sides, which are nominal already — and no catalog ids: the
// tapacanto is named, not identified.
export interface ReviewEdges {
  // Every banded side, cantos especiales included; `bandType`/`productName` are the auto tape's.
  sides?: string[]
  bandType?: string | null
  productName?: string | null
  color?: string | null
  // Server-built notation ("1L1C CS · L1 CD BLN"). Optional: a backend older than it doesn't send
  // it, and the page then counts the sides itself.
  notation?: string | null
  special?: ReviewSpecialEdge[]
  // Before this shape was typed the server forwarded a raw dict, snake_case and
  // all. Kept for the window where the web deploys ahead of the API — the two
  // live in separate repos — which `bandTypeOf` already reads through.
  band_type?: string | null
}

// A canto especial: one side carrying a tape of its own. `side` is in the frame of the object that
// holds it (nominal on the cut list, geometric on the diagram); `nominalSide` is always the piece's.
export interface ReviewSpecialEdge {
  side: EdgeSide
  nominalSide: EdgeSide
  bandType?: string | null
  productName?: string | null
  color?: string | null
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

// Edge banding of a piece in the diagram. Unlike the optimizer's PlacedPieceEdges this carries no
// catalog identifiers — the public endpoint strips them.
export interface ReviewPieceEdges {
  // Banded sides in geometric space (post-rotation): where the band physically goes on the sheet.
  sides: EdgeSide[]
  // The same bands in the piece's own frame — the one originalWidth/originalHeight and `notation`
  // refer to. Optional: a backend older than this field doesn't send it.
  nominalSides?: EdgeSide[]
  color?: string | null
  bandType?: string | null
  notation?: string | null
  // The tapacanto's catalog name, joined in by the server so this and the cut
  // list name the same tape.
  productName?: string | null
  special?: ReviewSpecialEdge[]
}

// A piece as laid out on the sheet. `pieceId` is the label the client typed, optionally suffixed
// `#N` when the label has several physical instances.
export interface ReviewPlacedPiece {
  pieceId: string
  x: number
  y: number
  width: number
  height: number
  rotated: boolean
  originalWidth: number
  originalHeight: number
  edges?: ReviewPieceEdges | null
}

export interface ReviewSheet {
  materialName: string | null
  width: number
  height: number
  thickness: number
  halfBoard: boolean
}

// One cutting pattern plus how many physical sheets are cut that way. Carries no saw paths and no
// efficiency stats: the client is shown the arrangement, not the shop's nesting quality.
export interface ReviewLayoutGroup {
  count: number
  sheetNumbers: number[]
  sheet: ReviewSheet
  placedPieces: ReviewPlacedPiece[]
  remainders: { x: number; y: number; width: number; height: number }[]
  piecesCount: number
}

export interface ReviewPreOrder {
  reference: string // pre-order code (PRE-…), displayed as the document reference
  status: ReviewPreOrderStatus
  orderCode: string | null // null until confirmed; "ORD-…" after confirmation
  clientName: string
  clientNote: string | null // note written by the client when requesting changes
  notes: string | null // commercial reference (project/site), same text printed on the order document
  currency: string
  subtotal: number
  // Sent by the server, deliberately not rendered: "Precio 2" names one of the
  // vendor's three catalog columns, and which one produced the number is not the
  // client's business — the discount amount is.
  priceLevelName?: string
  // How far below the list price this quote landed, and what it would have cost
  // without the level. Informative: the lines already print their final price,
  // and both are absent or 0 when there is no discount to claim.
  discountAmount?: number
  listSubtotal?: number
  taxRate?: number
  taxAmount?: number
  servicesTotal?: number
  total: number
  totalBoardsUsed: number
  totalPieces: number
  createdAt: string
  sentAt: string | null
  confirmedAt: string | null
  expiresAt: string | null
  lines: ReviewLine[]
  additionalServices?: ReviewService[]
  pieces: ReviewPiece[]
  layoutGroups: ReviewLayoutGroup[]
}
