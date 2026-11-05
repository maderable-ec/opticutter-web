// Cantos especiales: sides of a piece banded with a tape of their own, over the auto banding. They
// speak the auto banding's own notation — the seller types `2L CS BLN` (or `1L BLN`, taking the
// piece's type) and every surface writes them the same way, one count per tape. The API stores
// one `{ side, productId }` per side: the type and the alias are the product's.
//
// Mirrors `SPECIAL_SIDE_ORDER` / `edge_notation` in the backend's optimizations/labels.py.

import type { EdgeSide } from './cutDrawing'

// The order special edges are stored and sent in: the sides along the height, then the ones along
// the width, each pair in the order the Canto column fills it. A payload order, not a reading one:
// the notation writes the long sides first (`sideOrder`), which on a piece whose height is the
// longer measure is this same order.
export const SPECIAL_SIDE_ORDER: EdgeSide[] = ['left', 'right', 'top', 'bottom']

// --- L and C ---
// `L` is the pair of sides along the piece's LONGER measure and `C` the other pair: the shop's own
// reading (its files carry `90×1200 1L CS` for a strip banded along its 1200). The sides stay
// physical — `left`/`right` run along the height (the first measure, the grain), `top`/`bottom`
// along the width — so which pair is `L` depends on the measures: on 600×300 a `1L` is `left`, on
// 300×600 it is `top`. A square piece, and one whose measures are not typed yet, keeps
// `left`/`right` as `L`. Always the FINAL measures, never the cut ones. Mirrors `long_sides` in the
// backend's optimizations/labels.py.

// The measures that decide it: the form's strings or the API's numbers. Blank counts as unknown.
export interface PieceMeasures {
  height?: number | string | null
  width?: number | string | null
}

const measure = (v: number | string | null | undefined): number | undefined => {
  if (v == null || String(v).trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const ALONG_HEIGHT: EdgeSide[] = ['left', 'right']
const ALONG_WIDTH: EdgeSide[] = ['top', 'bottom']

// Whether the width is the longer measure: then `top`/`bottom` are the `L` sides.
export const widthIsLonger = (m?: PieceMeasures | null): boolean => {
  const h = measure(m?.height)
  const w = measure(m?.width)
  return h !== undefined && w !== undefined && h < w
}

export const longSides = (m?: PieceMeasures | null): EdgeSide[] =>
  widthIsLonger(m) ? ALONG_WIDTH : ALONG_HEIGHT
export const shortSides = (m?: PieceMeasures | null): EdgeSide[] =>
  widthIsLonger(m) ? ALONG_HEIGHT : ALONG_WIDTH
// The long sides first, then the short ones: the order the notation writes them in.
export const sideOrder = (m?: PieceMeasures | null): EdgeSide[] => [
  ...longSides(m),
  ...shortSides(m),
]

// The side at the same place on the other pair. What keeps a piece's notation when its longer
// measure changes: `2L` on `left`+`right` of a 600×300 piece is `top`+`bottom` once it reads 300×600.
export const OTHER_PAIR: Record<EdgeSide, EdgeSide> = {
  left: 'top',
  right: 'bottom',
  top: 'left',
  bottom: 'right',
}

const BAND_ABBR: Record<string, string> = { soft: 'CS', hard: 'CD' }

const countOf = (sides: readonly string[], m?: PieceMeasures | null) => {
  const long = longSides(m) as string[]
  return {
    long: sides.filter((s) => long.includes(s)).length,
    short: sides.filter((s) => !long.includes(s)).length,
  }
}

// `2L`, `1L1C`, `4L` — the backend's `edge_banding_notation` count, all four sides being `4L`.
export const sidesNotation = (sides: readonly string[], m?: PieceMeasures | null): string => {
  const { long, short } = countOf(sides, m)
  if (long === 2 && short === 2) return '4L'
  return `${long ? `${long}L` : ''}${short ? `${short}C` : ''}`
}

const LONG_WORDS = ['', 'un lado largo', 'los dos lados largos']
const SHORT_WORDS = ['', 'un lado corto', 'los dos lados cortos']

// The same count in words, for the sentences that confirm an entry.
export const sidesDescription = (sides: readonly string[], m?: PieceMeasures | null): string => {
  const { long, short } = countOf(sides, m)
  if (long === 2 && short === 2) return 'los cuatro lados'
  return [LONG_WORDS[long], SHORT_WORDS[short]].filter(Boolean).join(' y ')
}

// `2L CS BLN` — the parts that are known, in that order; the alias is uppercased like the backend's.
export const specialEdgeNotation = (
  sides: readonly string[],
  bandType?: string | null,
  alias?: string | null,
  m?: PieceMeasures | null,
): string =>
  [
    sidesNotation(sides, m),
    bandType ? BAND_ABBR[bandType.toLowerCase()] : '',
    alias?.trim().toUpperCase(),
  ]
    .filter(Boolean)
    .join(' ')

export const sortBySide = <T extends { side: EdgeSide }>(edges: T[]): T[] =>
  [...edges].sort((a, b) => SPECIAL_SIDE_ORDER.indexOf(a.side) - SPECIAL_SIDE_ORDER.indexOf(b.side))

export interface TapeGroup<T> {
  tape: string
  sides: EdgeSide[]
  first: T
}

// Special edges grouped by tape (`tapeOf`), each group in side order and the groups in the order of
// their first side, long sides first (`m`, the piece's measures) — so two long sides on one tape
// are ONE `2L`, as the seller typed them.
export const groupByTape = <T extends { side: EdgeSide }>(
  edges: T[],
  tapeOf: (edge: T) => string,
  m?: PieceMeasures | null,
): TapeGroup<T>[] => {
  const order = sideOrder(m)
  const groups = new Map<string, TapeGroup<T>>()
  for (const edge of [...edges].sort((a, b) => order.indexOf(a.side) - order.indexOf(b.side))) {
    const tape = tapeOf(edge)
    const group = groups.get(tape)
    if (group) group.sides.push(edge.side)
    else groups.set(tape, { tape, sides: [edge.side], first: edge })
  }
  return [...groups.values()]
}
