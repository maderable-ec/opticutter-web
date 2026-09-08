// Pure drawing primitives for the cut plan: the color palette, the dimension signature, and edge
// banding geometry. No JSX or state. Lives in shared/ because three features draw the same boards —
// the optimizer preview, the workshop board, and the client's public review — and shared/ must never
// import from a feature.

// Geometric side of a piece as drawn (post-rotation).
export type EdgeSide = 'top' | 'bottom' | 'left' | 'right'

// Paleta estable para colorear piezas por dimensión (firma). Colores tipo Tableau, legibles.
export const PALETTE = [
  '#4e79a7',
  '#59a14f',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#b07aa1',
  '#edc948',
  '#ff9da7',
  '#9c755f',
  '#86bcb6',
] as const

// Board chrome, taken from the backend's own diagram renderer
// (`opticutter-api/src/modules/optimizations/visualization.py`), which is itself aligned with the
// MADERABLE letterhead. The client sees the same cut plan twice — here and in the PDF — so the two
// have to be the same drawing, not two drawings of the same thing.
//
// Only the chrome is shared. PALETTE above stays as it is: on screen the hue identifies a piece
// size (and drives cross-highlighting), a job the printed diagram solves by labelling instead.
export const BOARD_OUTLINE = '#1d1d1b' // COLOR_BOARD_OUTLINE, and COLOR_DIM for the mm labels
export const PIECE_LABEL = '#212121' // COLOR_LABEL
export const WASTE_FILL = '#ececec' // COLOR_WASTE_FILL
export const WASTE_OUTLINE = '#9e9e9e' // COLOR_WASTE_OUTLINE
// Leftover dimensions drawn inside the hatch. Darker than the outline so the text reads over the
// pattern, lighter than PIECE_LABEL so a leftover never competes with a piece for attention.
export const WASTE_LABEL = '#6c757d'
// The board's own two measurements. Deliberately the same muted ink as WASTE_LABEL and never
// BOARD_OUTLINE: the sheet's size is an annotation ABOUT the frame, the least actionable text on the
// drawing (the piece and offcut numbers are the ones somebody acts on), so it has to sit behind
// them. Still 4.68:1 on white, so it stays legible rather than decorative.
export const BOARD_LABEL = '#6c757d'

// Edge banding has no counterpart in the backend diagram (it is drawn only on screen), so this one
// answers to legibility over the piece fills rather than to the document.
export const EDGE_COLOR = '#d9480f' // edge banding color in the diagram

// Wood grain. The melamine sheet has a direction and the shop has to lay it the right way round
// before the first cut; the diagram used to say nothing about it. Same colour and same spacing as
// the PDF's `COLOR_GRAIN` / `GRAIN_STEP_MM`, for the same reason the chrome above is shared — but a
// heavier opacity than its `GRAIN_ALPHA` (42/255 ≈ 0.16) on purpose: the PDF lays the grain over a
// near-white piece fill, while on screen PALETTE is saturated, and at the document's value the
// texture disappeared inside every piece and survived only in the free areas. Lines that stop dead
// at a piece border read as a rendering fault, not as a sheet.
//
// It is a property of the SHEET, not of what is cut out of it: a piece the optimizer rotated does
// NOT get a direction of its own, so this is one uniform texture over the whole board.
//
// A TEXTURE, not a ruling — fine and closely spaced, the way wood actually looks. Widely-spaced
// hairlines read as a grid someone drew over the plan. Both numbers are physical millimetres and
// therefore FIXED: grain does not get coarser because the sheet is bigger, and a client's small
// offcut still comes back visibly grained instead of carrying one lonely line. Because the stroke is
// in mm it grows with the zoom, which is what keeps the ink-to-paper ratio of the texture constant
// instead of thinning out the further you zoom in.
export const GRAIN_COLOR = '#8a7f72'
export const GRAIN_OPACITY = 0.25
export const GRAIN_STEP_MM = 26
export const GRAIN_STROKE_MM = 3

// ...and real grain is neither evenly spaced, nor all the same weight, nor continuous. Perfectly
// regular lines are what made the first attempt read as ruled paper: the irregularity IS the
// difference between wood and a grid. Each line takes a dash pattern (a long streak, a gap, a fleck,
// a gap), a weight and a spacing nudge from these tables by index.
//
// Tables and not an RNG, deliberately: React re-renders this on every hover and pan, so a texture
// that reshuffled itself would flicker — and the PDF mirrors these exact tables, which an RNG could
// never do. The three lengths are coprime, so the whole thing only repeats every 385 lines, more
// than any sheet holds.
export const GRAIN_DASHES_MM: readonly [number[], ...number[][]] = [
  [210, 16, 5, 16],
  [150, 20, 4, 22],
  [260, 14, 6, 14],
  [120, 18, 5, 26],
  [300, 22, 4, 18],
  [180, 15, 7, 20],
  [240, 24, 4, 15],
]
export const GRAIN_WEIGHTS: readonly [number, ...number[]] = [1.0, 0.7, 1.35, 0.85, 1.15]
export const GRAIN_JITTER: readonly [number, ...number[]] = [
  0, 0.22, -0.15, 0.3, -0.28, 0.12, -0.05, 0.18, -0.22, 0.08, -0.12,
]

export const SIDE_LABELS_ES: Record<EdgeSide, string> = {
  top: 'Superior',
  bottom: 'Inferior',
  left: 'Izquierdo',
  right: 'Derecho',
}

// Only what the drawing needs from an edge-banding record. Kept minimal on purpose: the optimizer's
// PlacedPieceEdges carries catalog identifiers that the public review response deliberately omits,
// so both satisfy this structurally without the drawing code knowing which one it got.
export interface DrawableEdges {
  sides: EdgeSide[]
  notation?: string | null
  color?: string | null
  bandType?: string | null
}

// Minimal structural shape shared by PlacedPiece (optimizer), CutPiece (orders) and
// ReviewPlacedPiece (review): enough to draw the scaled rectangle, its signature color, and the
// edge banding strips.
export interface DrawablePiece {
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  rotated: boolean
  edges?: DrawableEdges | null
}

// A piece the renderer can also identify, for highlighting and tap callbacks.
export type DrawnPiece = DrawablePiece & { pieceId: string }

// A leftover rectangle on the sheet, in the same mm coordinate space as the pieces. The optimizer,
// the cutting plan and the public review all send exactly these four numbers.
export interface DrawableRemainder {
  x: number
  y: number
  width: number
  height: number
}

// What SheetSvg needs to render one sheet, regardless of which endpoint produced it. Generic over
// the piece so callers get their own richer type back from the hover/tap callbacks.
export interface DrawableLayout<P extends DrawnPiece = DrawnPiece> {
  material: { width: number; height: number }
  placedPieces: P[]
  remainders: DrawableRemainder[]
}

// Leftover size drawn inside the rectangle: mm, no unit, like the piece labels. Rounded because a
// sub-millimetre leftover edge is noise on a saw whose kerf is 4 mm.
export const remainderLabel = (r: DrawableRemainder) =>
  `${Math.round(r.width)}×${Math.round(r.height)}`

// Hover text. Carries the unit and the area because it has the room the rectangle may not have, and
// it is the only way to read a small leftover without zooming in.
export const remainderTitle = (r: DrawableRemainder) =>
  `Sobrante ${remainderLabel(r)} mm · ${((r.width * r.height) / 1_000_000).toFixed(2)} m²`

// Identical pieces share the same nominal dimensions (originalWidth×originalHeight).
export const pieceSig = (p: Pick<DrawablePiece, 'originalWidth' | 'originalHeight'>) =>
  `${p.originalWidth}×${p.originalHeight}`

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

// Reveal floors for the measurements drawn on a shape's edges: the rectangle's mm size times the
// effective zoom, so a small piece stays clean at rest and uncovers its number when the diagram is
// zoomed. Offcuts get a lower bar than pieces on purpose — a long thin strip (106x2500 is the
// everyday shape) never cleared the piece bar, and the size of a retazo is exactly the number the
// shop reads to decide whether it is worth keeping. Below these, `EdgeDimensions` is not even asked;
// above them it still drops whichever of the two numbers does not fit.
// Space reserved outside the board for its own two measurements, in the same mm units. Half what it
// started as: floating that far off the sheet the numbers read as page furniture rather than as its
// dimensions, and the reserved band was eating drawing area on the shop panel, the smallest screen
// any of this runs on.
export const boardDimsMargin = (boardWidth: number, boardHeight: number) =>
  Math.max(boardWidth, boardHeight) * 0.035

export const showPieceDims = (w: number, h: number, scale: number) =>
  w * scale > 130 && h * scale > 90
export const showRemainderDims = (w: number, h: number, scale: number) =>
  w * scale > 55 && h * scale > 55

// Rotates the board content 90° clockwise and repositions it in the positive quadrant (the box
// [0,W]×[0,H] becomes [0,H]×[0,W]). Pair with a viewBox with swapped sides (H wide × W tall).
export const boardRotation = (height: number) => `translate(${height} 0) rotate(90)`

// Counter-rotation so a <text> inside the rotated group stays horizontal and readable, pivoting
// on its own anchor (use with textAnchor="middle" / dominantBaseline="central").
export const uprightText = (x: number, y: number) => `rotate(-90 ${x} ${y})`

export const bandedSides = (p: Pick<DrawablePiece, 'edges'>): EdgeSide[] => p.edges?.sides ?? []

// Splits the workshop's edge-banding notation into its two halves: the side count, and everything
// that qualifies it. The backend builds the string as `sides [type] [alias]` — '2L1C CS CSH' —
// where '2L1C' decides how the piece is banded and 'CS CSH' names the material doing it
// (`edge_banding_notation`, opticutter-api). They are printed at different sizes because they
// answer different questions, and on a small piece only the first half fits.
//
// The count comes from the piece's NOMINAL sides, so the string is stable under rotation and must
// be printed verbatim — recomputing it from a placed piece's (rotated) `edges.sides` turns every
// 1L into a 1C.
export const splitNotation = (notation?: string | null): [string, string] => {
  const [head = '', ...rest] = (notation ?? '').trim().split(/\s+/)
  return [head, rest.join(' ')]
}

export interface SideLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

// Edge banding line offset INWARD: with offset t/2 the outer edge of the stroke (thickness t)
// aligns with the piece boundary and the band grows inward. This shows which piece owns the edge
// without overlapping the cut line or invading the neighbor. Use with strokeLinecap="butt" and the
// same thickness t; adjacent two-side bands overlap cleanly at the corner.
export const insetSideLine = (
  side: EdgeSide,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): SideLine => {
  const o = t / 2
  switch (side) {
    case 'top':
      return { x1: x, y1: y + o, x2: x + w, y2: y + o }
    case 'bottom':
      return { x1: x, y1: y + h - o, x2: x + w, y2: y + h - o }
    case 'left':
      return { x1: x + o, y1: y, x2: x + o, y2: y + h }
    case 'right':
      return { x1: x + w - o, y1: y, x2: x + w - o, y2: y + h }
  }
}

// The optimizer suffixes a piece label with `#N` when it has several physical instances, so the
// base label is what a human recognises ("Puerta izq#2" → "Puerta izq"). Auto-generated ids
// (`piece_7`) carry no meaning and are reported as empty so callers can fall back to dimensions.
export const pieceLabel = (pieceId: string): string => {
  const base = pieceId.replace(/#\d+$/, '')
  return /^piece_\d+$/.test(base) ? '' : base
}
