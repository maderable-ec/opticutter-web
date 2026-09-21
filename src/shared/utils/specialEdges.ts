// Cantos especiales: sides of a piece banded with a tape of their own, over the auto banding. They
// speak the auto banding's own notation — the seller types `2L CS BLN` (or `1L BLN`, taking the
// piece's type) and every surface writes them the same way, one count per tape. The API stores
// one `{ side, productId }` per side: the type and the alias are the product's.
//
// Mirrors `SPECIAL_SIDE_ORDER` / `edge_notation` in the backend's optimizations/labels.py.

import type { EdgeSide } from './cutDrawing'

// The order sides are taken and written in: the long ones first, then the short ones, each pair in
// the order the Canto column fills it (`1L` is `left`, `1C` is `top` — the optimizer's
// `NOTATION_TO_SIDES`).
export const SPECIAL_SIDE_ORDER: EdgeSide[] = ['left', 'right', 'top', 'bottom']
export const LONG_SIDES: EdgeSide[] = ['left', 'right']
export const SHORT_SIDES: EdgeSide[] = ['top', 'bottom']

const BAND_ABBR: Record<string, string> = { soft: 'CS', hard: 'CD' }

const countOf = (sides: readonly string[]) => ({
  long: sides.filter((s) => s === 'left' || s === 'right').length,
  short: sides.filter((s) => s === 'top' || s === 'bottom').length,
})

// `2L`, `1L1C`, `4L` — the backend's `edge_banding_notation` count, all four sides being `4L`.
export const sidesNotation = (sides: readonly string[]): string => {
  const { long, short } = countOf(sides)
  if (long === 2 && short === 2) return '4L'
  return `${long ? `${long}L` : ''}${short ? `${short}C` : ''}`
}

const LONG_WORDS = ['', 'un lado largo', 'los dos lados largos']
const SHORT_WORDS = ['', 'un lado corto', 'los dos lados cortos']

// The same count in words, for the sentences that confirm an entry.
export const sidesDescription = (sides: readonly string[]): string => {
  const { long, short } = countOf(sides)
  if (long === 2 && short === 2) return 'los cuatro lados'
  return [LONG_WORDS[long], SHORT_WORDS[short]].filter(Boolean).join(' y ')
}

// `2L CS BLN` — the parts that are known, in that order; the alias is uppercased like the backend's.
export const specialEdgeNotation = (
  sides: readonly string[],
  bandType?: string | null,
  alias?: string | null,
): string =>
  [
    sidesNotation(sides),
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
// their first side — so two long sides on one tape are ONE `2L`, as the seller typed them.
export const groupByTape = <T extends { side: EdgeSide }>(
  edges: T[],
  tapeOf: (edge: T) => string,
): TapeGroup<T>[] => {
  const groups = new Map<string, TapeGroup<T>>()
  for (const edge of sortBySide(edges)) {
    const tape = tapeOf(edge)
    const group = groups.get(tape)
    if (group) group.sides.push(edge.side)
    else groups.set(tape, { tape, sides: [edge.side], first: edge })
  }
  return [...groups.values()]
}
