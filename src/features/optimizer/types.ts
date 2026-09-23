import type { Client } from 'src/features/clients/types'
import type { BranchRef } from 'src/features/branches/types'
import type { EdgeSide } from 'src/shared/utils/cutDrawing'
import type { MaterialForm, RequirementForm } from './optimizerForm'

// Response types for POST /api/v1/optimize/. The contract is deterministic and cached by
// input hash; see the endpoint spec for field details.

// Portal target for the optimizer's modals. CModal portals to document.body by default, which sits
// OUTSIDE the element handed to the Fullscreen API — the modal would render behind the fullscreen
// page and be invisible. Pointing it at the fullscreen host keeps it visible in both modes.
export type ModalContainer = () => Element | null

// Fill order for a catalog board that carries pooled offcuts (same material).
// 'auto' lets the backend pick the least-waste layout; the others force it.
export type PoolFillOrder = 'auto' | 'offcutsFirst' | 'catalogFirst'

export type MaterialSourceKind = 'catalog' | 'companyOffcut' | 'clientOffcut' | 'manual'

// Defined with the drawing primitives (shared/) since that's what consumes it; re-exported here
// so the rest of the optimizer keeps importing its types from one place.
export type { EdgeSide }

// Physical material of a sheet, as returned in each Layout.
export interface OptimizeMaterialSheet {
  materialKey: string
  sheetNumber: number
  height: number
  width: number
  thickness: number
  area: number
  halfBoard?: boolean
}

// Edge banding for a piece. Keys arrive in snake_case from the server.
export interface PlacedPieceEdges {
  // Banded sides in geometric space (post-rotation), cantos especiales included.
  sides: EdgeSide[]
  // The auto tape's identity: null when every side it banded went special.
  product_id: number | null
  code: string | null
  color: string | null
  // "1L1C CS CSH · L1 CD BLN": the auto part, then each canto especial.
  notation: string | null
  special?: PlacedSpecialEdge[]
}

// A canto especial on a placed piece: `side` is geometric (where to paint it), `nominal_side` the
// piece's own (the one its L1/C2 token names).
export interface PlacedSpecialEdge {
  side: EdgeSide
  nominal_side: EdgeSide
  product_id: number
  code: string | null
  color: string | null
  band_type: string | null
  alias: string | null
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
  // Edge banding applied to the piece, or null if none. See PlacedPieceEdges.
  edges?: PlacedPieceEdges | null
  // Moved by hand: not where the optimizer put it. Present only when true.
  adjusted?: boolean
}

export interface Remainder {
  x: number
  y: number
  height: number
  width: number
  // A «retazo entero»: the seller asked for it to be cut out in one piece. Present only when true.
  keptWhole?: boolean
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
  // This sheet differs from what the optimizer produced. Present only when true.
  adjusted?: boolean
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
  halfBoard?: boolean
  // Cut without the configured trim margins. Optional: a payload cached before the field existed
  // comes back without it, and an order snapshot frozen before it never will.
  skipTrim?: boolean
}

export interface EdgeBandingSummary {
  productId: number | null
  productCode: string | null
  productName: string | null
  thickness: number | null
  color?: string | null
  netLinearM: number
  linearM: number
  billedLinearM: number
  pricePerM: number
  totalCost: number
}

// Groups sheets sharing the same cut pattern (deduplicated for the diagram).
export interface LayoutGroup {
  patternId: number
  count: number
  sheetNumbers: number[]
  materialKey: string
  layout: Layout
}

export interface PricingData {
  // Catalog price level billed on the boards the seller marked (1 = list).
  priceLevel: number
  priceLevelName: string
  // How far below the list price the marked boards landed, and what the same
  // document would have cost without the level. Informative: no total is
  // derived from them, and both are 0 at level 1 or with nothing marked.
  // Optional, because the order synthesizes its PricingData from flat columns
  // that don't carry them.
  discountAmount?: number
  listSubtotal?: number
  // Net: every line already prints at its final price, so the subtotal IS the
  // sum of the document, discount or not.
  subtotal: number
  // Net sum of the additional services (they are registered tax-included and
  // converted server-side). Optional: absent on raw /optimize responses.
  servicesTotal?: number
  taxRate: number
  taxAmount: number
  total: number
}

// A piece the available stock could not hold, grouped by size. Only a pool of
// finite retazos can actually run out of material, so this is empty on every
// quote anchored on a catalog board.
export interface UnplacedPiece {
  materialKey: string
  label: string | null
  height: number
  width: number
  quantity: number
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
  pricing?: PricingData
  // Alternative-solution seed this result was computed with (0 = canonical).
  variant?: number
  // Optional: a result cached before the field existed comes back without it.
  unplaced?: UnplacedPiece[]
  // Hand adjustments that were NOT applied, and why (the pool fell back to the optimizer's plan).
  layoutIssues?: LayoutIssue[]
  // What the applied hand adjustments changed against the optimizer's plan; null without any.
  adjustmentSummary?: AdjustmentSummary | null
  // The hand adjustments actually applied to this plan (empty sheets left out); null without any.
  layoutAdjustments?: LayoutAdjustment[] | null
}

// --- Hand adjustments to the plan (the layout editor) ---
//
// A sheet is its placements: which stock it is and where each piece instance sits. Cuts, offcuts,
// metrics and prices are all derived by the server, which is also the only judge of what is valid —
// the editor snaps to the positions it offers. An adjustment REPLACES the optimizer's sheets for its
// pool (the material the pieces point at plus the retazos pooled to it).

export interface AdjustedPiece {
  pieceId: string
  x: number
  y: number
  rotated: boolean
}

// A «retazo entero»: free space the seller wants cut out in one piece. A wish about free space, not
// an obstacle — a piece placed on it later simply uses it.
export interface WholeOffcut {
  x: number
  y: number
  width: number
  height: number
}

export interface AdjustedSheet {
  materialKey: string
  halfBoard: boolean
  pieces: AdjustedPiece[]
  wholeOffcuts: WholeOffcut[]
}

export interface LayoutAdjustment {
  poolKey: string
  sheets: AdjustedSheet[]
}

export interface LayoutIssue {
  poolKey: string
  code: string
  // Seller-facing, in Spanish.
  message: string
  sheetIndex: number | null
  pieceIds: string[]
}

export interface AdjustmentSummary {
  movedPieces: number
  boardsDelta: number
  boardCostDelta: number
  // Offcuts the seller asked to keep whole.
  wholeOffcuts?: number
}

export interface EditablePiece {
  pieceId: string
  label: string
  width: number
  height: number
  canRotate: boolean
}

export interface SheetBinInfo {
  materialKey: string
  halfBoard: boolean
  width: number
  height: number
  costPerUnit: number
  label: string
  // Units still unused (retazos); null = unlimited.
  remaining: number | null
}

export interface EditableSheet extends AdjustedSheet {
  // Derived by the server; null for a sheet with nothing on it yet.
  layout: Layout | null
}

export interface EditablePool {
  poolKey: string
  label: string
  bins: SheetBinInfo[]
  pieces: EditablePiece[]
  pending: string[]
  sheets: EditableSheet[]
  adjusted: boolean
  // Only retazos, no board to open: pieces may stay pending when the job is applied.
  finite: boolean
}

export interface LayoutEvaluateResponse extends OptimizeResponse {
  pools: EditablePool[]
}

export type LayoutProbe =
  | { kind: 'piece'; poolKey: string; pieceId: string; sheetIndex: number | null }
  | {
      kind: 'leftover'
      poolKey: string
      sheetIndex: number
      x: number
      y: number
      width: number
      height: number
    }
  | { kind: 'sheet'; poolKey: string; sheetIndex: number }

export interface CandidatePosition {
  x: number
  y: number
  rotated: boolean
  // Whole offcuts of the sheet (indices into its `wholeOffcuts`) this position lands on: placing the
  // piece there uses them, so they are no longer kept whole.
  usesWholeOffcuts?: number[]
}

export interface SheetFit {
  sheetIndex: number
  fits: boolean
  fitsRotated: boolean
  positions: CandidatePosition[]
  freeRects: Remainder[]
}

// In the sheet's own axes: `x` runs along its width, `y` along its height (the largo).
export type LeftoverDirection = 'x+' | 'x-' | 'y+' | 'y-'

export interface LeftoverExtension extends WholeOffcut {
  direction: LeftoverDirection
}

export interface SheetConversion {
  halfBoard: boolean
  shiftX: number
  shiftY: number
}

export interface LayoutCandidatesResponse {
  sheets: SheetFit[]
  extensions: LeftoverExtension[]
  conversions: SheetConversion[]
}

// --- Request inputs (what the frontend sends) ---

export interface CatalogMaterialInput {
  key: string
  source: 'catalog'
  productId: number
  // Fill order when this board has attached (pooled) offcuts; omitted otherwise.
  fillOrder?: PoolFillOrder
  // Whether THIS board is billed at the quote's `priceLevel` rather than the list price.
  // Absent/false = list price: the seller checks board by board while quoting (a client
  // negotiates the melamina and not the MDF). Does not affect geometry or the optimize
  // cache hash, only `pricing`.
  applyPriceLevel?: boolean
  // Whether a sheet the optimizer billed as a half board is delivered and charged whole, the
  // client keeping the uncut half. Absent/false = the half board stands. Not in the hash either:
  // the server reshapes the cached plan (the pieces do not move) instead of searching again.
  wholeBoard?: boolean
  // Whether this board and every retazo attached to it are cut WITHOUT the trim margins
  // configured in settings. Absent/false = the shop squares the board as usual. Unlike the
  // two marks above this one IS in the hash: it moves the geometry, so ticking it re-runs
  // the search instead of re-pricing a cached plan.
  skipTrim?: boolean
}

export interface InlineMaterialInput {
  key: string
  source: Exclude<MaterialSourceKind, 'catalog'>
  height: number
  width: number
  thickness: number
  costPerUnit?: number
  label?: string
  // Finite units available (pooled offcut). Defaults to 1 server-side.
  quantity?: number
  // If set, this offcut is extra stock of the catalog board with this key: its
  // pieces come from that board's requirements, packed across board + offcuts.
  poolKey?: string
  // Same flag as the catalog board's, for a group anchored on a retazo (no board). Only ever
  // sent on the ANCHOR: the server coerces it to false on a pooled material, since the
  // anchor's setting already covers the whole pool.
  skipTrim?: boolean
}

export type MaterialInput = CatalogMaterialInput | InlineMaterialInput

export interface EdgeBandingSpec {
  sides: EdgeSide[]
  productId?: number
}

// A canto especial as the API takes it. The type and the alias are the product's.
export interface SpecialEdgeSpec {
  side: EdgeSide
  productId: number
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
  // Per-side tapes that win over `edgeBanding` on the sides they name. Omitted when empty.
  specialEdges?: SpecialEdgeSpec[]
  // Workshop codes (abisagrado / ranurado / ensamble / división). Production data, not geometry: the API keeps
  // them out of the optimization hash, and `signatureOf` keeps them out of the staleness check.
  hingingCode?: string
  groovingCode?: string
  assemblyCode?: string
  divisionCode?: string
}

// Billed additional service on a quote (qty × editable unit price). Not cut
// geometry: it rides alongside the optimizer inputs and is folded into the total
// server-side, after the per-board price level is applied.
export interface AdditionalServiceInput {
  serviceId?: number
  name: string
  unitPrice: number
  quantity: number
}

export interface OptimizePayload {
  materials: MaterialInput[]
  requirements: RequirementInput[]
  clientId?: number
  priceLevel?: number
  // Alternative-solution seed: bump it ("Generar otra alternativa") to get a
  // genuinely different deterministic layout when alternatives exist.
  variant?: number
  // The seller's hand adjustments to the plan, one entry per pool. Applied after the server's
  // cache, so they never re-run the search.
  layoutAdjustments?: LayoutAdjustment[] | null
}

export interface LayoutCandidatesPayload extends OptimizePayload {
  probe: LayoutProbe
}

// --- Optimizer drafts (persistence) ---

// What gets persisted is the RAW FORM STATE (including `uid` values), not the `buildPayload()` contract.
// This allows the form to be reconstructed exactly, including incomplete/invalid rows.
// The backend treats `payload` as opaque JSON; `version` allows future migrations.
export interface OptimizerDraftPayload {
  version: 1
  materials: MaterialForm[]
  requirements: RequirementForm[]
  // Billed additional services. Optional because drafts saved before the wizard had a services step
  // do not carry the key; the backend stores `payload` as an opaque JSON object, so adding it needed
  // no schema change on that side.
  additionalServices?: AdditionalServiceInput[]
  // Hand adjustments to the plan, keyed by the payload's material keys — which are the form's
  // uids, persisted above, so they still name the same pools when the draft is loaded back.
  layoutAdjustments?: LayoutAdjustment[] | null
}

// List item (no payload).
export interface DraftSummary {
  id: number
  name: string
  clientId: number | null
  // Owning branch (required FK): always present in list and detail responses.
  branch: BranchRef
  createdAt: string
  updatedAt: string
}

// Detail item (includes payload).
export interface Draft extends DraftSummary {
  payload: OptimizerDraftPayload
}
