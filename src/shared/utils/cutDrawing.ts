// Pure drawing primitives for the cut plan: the color palette, the dimension signature, and edge
// banding geometry. No JSX or state. Lives in shared/ because three features draw the same boards —
// the optimizer preview, the workshop board, and the client's public review — and shared/ must never
// import from a feature.

import { fmtM2 } from './format'
import type { WorkshopCodes } from './workshopCodes'

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
// edge banding strips. The workshop codes ride along where the plan carries them (the seller's and
// the operator's, never the client's review), for the stack `pieceTextStack` prints.
export interface DrawablePiece extends WorkshopCodes {
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  rotated: boolean
  edges?: DrawableEdges | null
  // Moved by hand (the layout editor): not where the optimizer put it.
  adjusted?: boolean
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
  // A «retazo entero»: the seller asked for it to be cut out in one piece.
  keptWhole?: boolean
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
  `${r.keptWhole ? 'Retazo entero' : 'Retazo'} ${remainderLabel(r)} mm · ${fmtM2((r.width * r.height) / 1_000_000)}`

// A «retazo entero» (kept in one piece on purpose) reads apart from an ordinary leftover by its outline:
// solid instead of dashed, in a teal no piece colour or edge band uses, over a tinted fill.
export const WHOLE_OFFCUT_OUTLINE = '#1f6f8b'
export const WHOLE_OFFCUT_FILL = '#dcebf1'

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

// The notation of each tape on its own line: `2L1C CS CSH · 1C CS BNL` → `['2L1C CS CSH', '1C CS BNL']`.
// The server writes the auto banding first and then one group per canto especial, joined by ` · `
// (`edge_notation`, opticutter-api). Splitting at the FIRST WORD instead, as `splitNotation` does,
// put the auto tape's type and alias on one line with every special tape after it, which read as
// one tape. A piece with a single tape is a single entry — the old string, whole.
export const notationTapes = (notation?: string | null): string[] =>
  (notation ?? '')
    .split(' · ')
    .map((tape) => tape.trim())
    .filter(Boolean)

export interface StackLine {
  key: string
  text: string
  // Font size and baseline centre, in the sheet's millimetres.
  size: number
  y: number
}

// The text stacked over a piece's centre, top to bottom: its edge-banding notation and, under it,
// its workshop codes (`codes`, bare: "B2 · R1"). Worked out here once for both renderers — the
// operator's canvas (`WorkshopBoardSvg`) and the seller's diagram (`SheetSvg`) — so the seller sees
// on the sheet exactly what the shop will. `hidden` empties it (a piece the operator already cut
// belongs to its ✓). Both draw the board through `boardRotation`, so the frame below holds in both.
export const pieceTextStack = (
  piece: Pick<DrawablePiece, 'x' | 'y' | 'width' | 'height' | 'edges'>,
  { scale, codes, hidden = false }: { scale: number; codes: string; hidden?: boolean },
): { cx: number; cy: number; lines: StackLine[] } => {
  const minSide = Math.min(piece.width, piece.height)
  // Edge-banding notation, printed VERBATIM: the server computes it from the piece's nominal
  // sides, so it survives rotation. Recomputing it from `edges.sides` (which is rotated into the
  // drawing's frame) would turn every 1L into a 1C.
  const tapes = notationTapes(piece.edges?.notation)
  const [notation, bandNote] = splitNotation(tapes[0])
  // On screen the piece's y axis runs horizontally and its x axis vertically, because of
  // `boardRotation` — the same frame `EdgeDimensions` documents. So the room a horizontal label
  // has is `piece.height` wide by `piece.width` tall.
  //
  // Same rate as the measurements (`Math.min(w, h) / 6`), with a ceiling just under theirs. It
  // used to be set at nearly twice their size, which made a qualifier shout over the numbers it
  // qualifies; dropping it to `/7` overcorrected and left the canto reading as a footnote.
  // Matching the rate and separating them by position — canto in the middle, measurements on the
  // edges — is the hierarchy that actually works. The second term is what keeps a long notation
  // inside a narrow piece.
  const noteSize = clamp(
    Math.min(minSide / 6, piece.height / Math.max(notation.length * 0.62, 1)),
    14,
    56,
  )
  // Revealed earlier than the measurements (a 4-character string needs far less room), and the
  // qualifier only once the piece is big enough for two lines.
  const roomy = !hidden && piece.width * scale > 60 && piece.height * scale > 60
  const showNote = roomy && !!notation
  const showBandNote = showNote && !!bandNote && showPieceDims(piece.width, piece.height, scale)
  // With cantos especiales the piece carries several tapes, and each one gets a line of its own —
  // `2L1C CS CSH` over `1C CS BNL` — instead of the count/qualifier pair a single tape uses. Where
  // the qualifier would not fit either, each line keeps its count alone (`2L1C` over `1C`).
  // Sized off the longest line, the way a single notation is sized off its own length.
  const tapeLines = tapes.map((tape) => (showBandNote ? tape : (splitNotation(tape)[0] ?? '')))
  const tapeSize = clamp(
    Math.min(
      minSide / 6,
      piece.height / Math.max(Math.max(...tapeLines.map((t) => t.length)) * 0.62, 1),
    ),
    14,
    56,
  )
  // The workshop codes ("B2 · R1", bare: the shop knows its own codes, and the service word only
  // cost room on a small piece) go UNDER the canto: they are what the operator sets
  // aside for the bander, so they are revealed as early as the canto itself rather than with the
  // qualifier. Sized off their own length, like the notation, so a long line stays inside a
  // narrow piece.
  const codesSize = clamp(
    Math.min(minSide / 7, piece.height / Math.max(codes.length * 0.58, 1)),
    12,
    44,
  )
  const cx = piece.x + piece.width / 2
  const cy = piece.y + piece.height / 2
  // The lines stacked over the piece's centre. A piece's on-screen height is `piece.width` (see
  // above), so when the stack would not fit it is shrunk as a whole: every line stays, just
  // smaller — zooming in brings it back.
  const bandingLines =
    tapes.length > 1
      ? tapeLines.map((text, k) => (showNote ? { key: `tape-${k}`, text, size: tapeSize } : null))
      : [
          showNote ? { key: 'note', text: notation, size: noteSize } : null,
          showBandNote ? { key: 'band', text: bandNote, size: noteSize * 0.75 } : null,
        ]
  const stack = [
    ...bandingLines,
    roomy && codes ? { key: 'codes', text: codes, size: codesSize } : null,
  ].filter((line): line is { key: string; text: string; size: number } => !!line)
  const LINE_PITCH = 1.1
  const stackHeight = stack.reduce((h, line) => h + line.size * LINE_PITCH, 0)
  const fit = stackHeight > 0 ? Math.min(1, (piece.width * 0.85) / stackHeight) : 1
  let top = cy - (stackHeight * fit) / 2
  const lines = stack.map((line) => {
    const size = line.size * fit
    const y = top + (size * LINE_PITCH) / 2
    top += size * LINE_PITCH
    return { ...line, size, y }
  })
  return { cx, cy, lines }
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
