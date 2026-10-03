// Entry of the "Cantos especiales" column: `2L CS BLN` → a count of sides, a band type and an alias,
// resolved against the catalog to the one tapacanto those sides will carry. It is the Canto column's
// own notation on purpose, so the seller writes one language: `2L CS BLN` puts both long sides on
// BLN, and two long sides on DIFFERENT tapes are two entries, `1L CS BLN` then `1L CS CHM`.
//
// A canto especial ADDS to the Canto, never replaces it: it only takes sides the Canto leaves bare,
// so per kind the Canto plus the special edges band at most the two sides there are. A `2L1C` piece
// plus `1C BLN` is banded on all four sides; a `2L` piece refuses `1L BLN` and says to lower the Canto
// to `1L` first. The other way round, the Canto cannot grow onto a side a special edge holds
// (`cantoFits`). The piece is symmetric, so what a special edge holds is a COUNT per kind, not a
// side: when the Canto takes the side one sits on (`1L` is always `left`), it moves to the other
// (`seatSpecialEdges`). The type may be left out (`1L BLN`): the entry then takes the piece's own,
// since the common case is changing the colour of a side, not its type. Pure — the cell turns what
// comes back into tags and toasts.
//
// The alias is looked up in the WHOLE catalog of active tapacantos, not in the board's coordinated
// list: a special edge exists precisely to put a different design on a side. An alias names a
// design, and a design is stocked in several widths (and sometimes both types), so the pick is the
// same one the auto banding makes — the narrowest width that covers the board
// (`edgeWidthFitsBoard`), ordered like `find_edge_bandings_for_board` in the backend. That is also
// why the confirmation names the product: the seller sees which tape the alias resolved to.

import type { EdgeBandingProduct } from 'src/features/products/types'
import {
  LONG_SIDES,
  SHORT_SIDES,
  groupByTape,
  sidesDescription,
  sidesNotation,
  sortBySide,
  specialEdgeNotation,
} from 'src/shared/utils/specialEdges'
import { stripBandingPrefix } from 'src/shared/utils/text'
import {
  BANDTYPE_ABBR,
  BANDTYPE_LABEL,
  CS_CD_TO_BANDTYPE,
  edgeWidthFitsBoard,
  sidesFromNotation,
} from './optimizerForm'
import type { BandType, CantoNotation, SpecialEdgeForm } from './optimizerForm'
import type { EdgeSide } from './types'

export const SPECIAL_EDGE_FORMAT_HINT = 'Lados [Tipo] Alias, p. ej. 2L CS BLN o 1L BLN'

interface ParsedSpecialEdge {
  long: number
  short: number
  // Absent when the seller left it out: the entry takes the piece's own type.
  bandType?: BandType
  alias: string
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

// `1L`, `2L`, `1C`, `2C`, `1L1C`, `2L1C`, `1L2C`, `4L` (also `2L2C`), any case — the notations the
// Canto column offers.
const parseSides = (token: string): { long: number; short: number } | null => {
  const match = /^(?:([1-4])L)?(?:([12])C)?$/i.exec(token)
  if (!match || (!match[1] && !match[2])) return null
  const long = Number(match[1] ?? 0)
  const short = Number(match[2] ?? 0)
  if (long === 4) return short ? null : { long: 2, short: 2 }
  return long > 2 ? null : { long, short }
}

const isBandTypeToken = (token: string) => token.toUpperCase() in CS_CD_TO_BANDTYPE

// `2L CS BLN` or `2L BLN`, case-insensitive, any run of spaces between the parts.
export const parseSpecialEdge = (text: string): Result<ParsedSpecialEdge> => {
  const entry = text.trim()
  const parts = entry.split(/\s+/).filter(Boolean)
  if (parts.length < 2 || parts.length > 3) {
    return { ok: false, error: `«${entry}» no tiene el formato ${SPECIAL_EDGE_FORMAT_HINT}` }
  }
  const [rawSides = '', ...rest] = parts
  const sides = parseSides(rawSides)
  if (!sides) {
    return {
      ok: false,
      error: `«${rawSides}» no es una notación de lados: usa 1L, 2L, 1C, 2C, 1L1C, 2L1C o 4L`,
    }
  }
  const alias = (rest[rest.length - 1] ?? '').toUpperCase()
  if (rest.length === 1 && isBandTypeToken(alias)) {
    return { ok: false, error: `«${entry}» no dice el alias del tapacanto` }
  }
  if (rest.length === 2) {
    const rawType = rest[0] ?? ''
    const bandType = CS_CD_TO_BANDTYPE[rawType.toUpperCase()]
    if (!bandType) {
      return {
        ok: false,
        error: `El tipo «${rawType}» no existe: usa CS (suave) o CD (duro), u omítelo para usar el de la pieza`,
      }
    }
    return { ok: true, value: { ...sides, bandType, alias } }
  }
  return { ok: true, value: { ...sides, alias } }
}

const aliasOf = (p: EdgeBandingProduct): string => (p.alias ?? '').trim().toUpperCase()

// Narrowest first, then the tape's own thickness, then the id — the backend's order for the
// coordinated list, so a special edge picks the width the auto banding would.
const byWidth = (a: EdgeBandingProduct, b: EdgeBandingProduct): number =>
  (a.attributes.width ?? 0) - (b.attributes.width ?? 0) ||
  (a.attributes.thickness ?? 0) - (b.attributes.thickness ?? 0) ||
  Number(a.id) - Number(b.id)

// The tapacanto an alias and a type name on a board of this thickness (undefined thickness =
// non-catalog material: every width fits, as in the picker).
export const resolveSpecialEdge = (
  parsed: { bandType: BandType; alias: string },
  catalog: EdgeBandingProduct[],
  thickness: number | undefined,
): Result<EdgeBandingProduct> => {
  const { alias, bandType } = parsed
  const design = catalog.filter((p) => aliasOf(p) === alias)
  if (design.length === 0) {
    return { ok: false, error: `No hay ningún tapacanto activo con el alias «${alias}»` }
  }
  const typed = design.filter((p) => p.attributes.bandType === bandType)
  if (typed.length === 0) {
    const label = BANDTYPE_LABEL[bandType].toLowerCase()
    return {
      ok: false,
      error: `«${alias}» no existe en canto ${label} (${BANDTYPE_ABBR[bandType]})`,
    }
  }
  const [product] = typed
    .filter((p) => edgeWidthFitsBoard(thickness, p.attributes.width))
    .sort(byWidth)
  if (!product) {
    return {
      ok: false,
      error: `Ningún ancho de «${alias}» ${BANDTYPE_ABBR[bandType]} cubre un tablero de ${thickness} mm`,
    }
  }
  return { ok: true, value: product }
}

// One tag per tape: its sides in count notation plus the product's type and alias (`2L CS BLN`),
// read off the catalog so it always says what the tape really is — including a type the seller
// left out when typing it.
export interface SpecialEdgeTag {
  productId: string
  sides: EdgeSide[]
  label: string
  product: EdgeBandingProduct | undefined
}

export const specialEdgeTags = (
  edges: SpecialEdgeForm[],
  byId: Map<string, EdgeBandingProduct>,
): SpecialEdgeTag[] =>
  groupByTape(edges, (e) => e.productId).map(({ tape, sides }) => {
    const product = byId.get(tape)
    return {
      productId: tape,
      sides,
      product,
      label: product
        ? specialEdgeNotation(sides, product.attributes.bandType, product.alias)
        : `${sidesNotation(sides)} ?`,
    }
  })

// The sides the special edges hold, as the Canto's own record: what `CantoPreview` draws dashed.
export const specialSidesOf = (edges: SpecialEdgeForm[]): Record<EdgeSide, boolean> => ({
  top: edges.some((e) => e.side === 'top'),
  bottom: edges.some((e) => e.side === 'bottom'),
  left: edges.some((e) => e.side === 'left'),
  right: edges.some((e) => e.side === 'right'),
})

export const specialEdgeFits = (
  product: EdgeBandingProduct | undefined,
  thickness: number | undefined,
): boolean => !product || edgeWidthFitsBoard(thickness, product.attributes.width)

export interface SpecialEdgeMessage {
  message: string
  color: 'success' | 'warning'
}

const confirmation = (
  sides: EdgeSide[],
  product: EdgeBandingProduct,
  inherited: boolean,
): string => {
  const bandType = product.attributes.bandType as BandType | undefined
  const type = bandType
    ? ` · canto ${BANDTYPE_LABEL[bandType].toLowerCase()} (${BANDTYPE_ABBR[bandType]}${inherited ? ', el de la pieza' : ''})`
    : ''
  return (
    `Canto especial ${sidesNotation(sides)} (${sidesDescription(sides)} sin canto)${type}: ` +
    `${stripBandingPrefix(product.name)} (${product.code})`
  )
}

type SideKind = 'long' | 'short'
const KIND_SIDES: Record<SideKind, EdgeSide[]> = { long: LONG_SIDES, short: SHORT_SIDES }
const KIND_WORDS = { long: 'lados largos', short: 'lados cortos' } as const

// The Canto of a count per kind, on its canonical sides (`1L` is `left`, `1C` is `top`) — the
// notation the Canto column would show for it, '—' for none.
const cantoOfCounts = (long: number, short: number): CantoNotation =>
  (sidesNotation([...LONG_SIDES.slice(0, long), ...SHORT_SIDES.slice(0, short)]) ||
    '—') as CantoNotation

// Why an entry did not fit when the Canto alone is in the way: the sides of the kinds it asked for
// that the Canto covers, and the Canto that would leave room — the seller asked for a side the
// Canto already bands, and a special edge adds.
const cantoInTheWay = (
  entry: string,
  canto: EdgeSide[],
  covered: EdgeSide[],
  suggested: CantoNotation,
): string =>
  `«${entry}»: el Canto ${sidesNotation(canto)} ya cubre ${sidesDescription(covered)}. ` +
  'Un canto especial se suma al Canto, no lo reemplaza: ' +
  `${suggested === '—' ? 'quita el Canto' : `cambia el Canto a ${suggested}`} para agregarlo.`

// Why an entry did not fit when other special edges hold the sides: nothing of its kind is free, or
// it asked for both and one is taken. With the Canto holding the rest, both have to give.
const specialsInTheWay = (
  entry: string,
  kind: SideKind,
  free: number,
  cantoHolds: number,
): string => {
  if (cantoHolds > 0) {
    return (
      `«${entry}» pide los dos ${KIND_WORDS[kind]}, pero el Canto cubre uno y el otro tiene ` +
      'canto especial: quita ese tag y baja el Canto para agregarlo'
    )
  }
  return free === 0
    ? `«${entry}»: ya no quedan ${KIND_WORDS[kind]} libres; quita el tag que los ocupa para cambiarlos`
    : `«${entry}» pide los dos ${KIND_WORDS[kind]} y solo queda uno libre; quita el tag que ocupa el otro`
}

// What an entry needs to know about its piece.
export interface SpecialEdgePiece {
  // Board thickness (catalog boards only), to pick the width that covers the edge.
  thickness?: number
  // The piece's own type (the Tipo column, or the one of its tapacanto): what an entry with no
  // CS/CD takes. '' when the piece has none.
  bandType: BandType | ''
  // The sides the Canto column bands: an entry may only take the OTHER ones.
  autoSides: EdgeSide[]
}

// The sides of one kind an entry may take: those with no edge at all — neither the Canto's nor a
// special one.
const freeSides = (kind: EdgeSide[], taken: Set<EdgeSide>, autoSides: Set<EdgeSide>) =>
  kind.filter((s) => !taken.has(s) && !autoSides.has(s))

// The sides a piece still has bare, in the Canto notation (`1L1C`), '' for none: what the cell
// offers before anything is typed.
export const freeSidesNotation = (autoSides: EdgeSide[], edges: SpecialEdgeForm[]): string => {
  const auto = new Set(autoSides)
  const taken = new Set(edges.map((e) => e.side))
  return sidesNotation([...LONG_SIDES, ...SHORT_SIDES].filter((s) => !auto.has(s) && !taken.has(s)))
}

// Applies what the seller typed. Several entries may come at once, separated by commas or
// semicolons; each one is accepted or refused on its own, and every outcome gets a message — the
// confirmation names the real product, a refusal says exactly what to fix. An entry only takes
// sides with no edge: one the Canto bands is refused with the Canto that would leave room, and a
// side that already carries a special edge is never overwritten (the seller removes that tag).
export const addSpecialEdges = (
  current: SpecialEdgeForm[],
  text: string,
  catalog: EdgeBandingProduct[],
  piece: SpecialEdgePiece,
): { next: SpecialEdgeForm[]; messages: SpecialEdgeMessage[]; rejected: string[] } => {
  const autoSides = new Set(piece.autoSides)
  let next = [...current]
  const messages: SpecialEdgeMessage[] = []
  const rejected: string[] = []
  for (const entry of text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const refuse = (message: string) => {
      messages.push({ message, color: 'warning' })
      rejected.push(entry)
    }
    const parsed = parseSpecialEdge(entry)
    if (!parsed.ok) {
      refuse(parsed.error)
      continue
    }
    const { long, short, alias } = parsed.value
    const bandType = parsed.value.bandType ?? piece.bandType
    if (!bandType) {
      refuse(`«${entry}» no dice el tipo y la pieza no tiene uno: escribe CS o CD`)
      continue
    }
    const taken = new Set(next.map((e) => e.side))
    const free = {
      long: freeSides(LONG_SIDES, taken, autoSides),
      short: freeSides(SHORT_SIDES, taken, autoSides),
    }
    const lacking = (['long', 'short'] as const).filter(
      (kind) => free[kind].length < parsed.value[kind],
    )
    if (lacking.length) {
      const deficit = (kind: SideKind) =>
        lacking.includes(kind) ? parsed.value[kind] - free[kind].length : 0
      const cantoHolds = (kind: SideKind) => KIND_SIDES[kind].filter((s) => autoSides.has(s))
      const blocked = lacking.find((kind) => cantoHolds(kind).length < deficit(kind))
      if (blocked) {
        refuse(specialsInTheWay(entry, blocked, free[blocked].length, cantoHolds(blocked).length))
      } else {
        const suggested = cantoOfCounts(
          cantoHolds('long').length - deficit('long'),
          cantoHolds('short').length - deficit('short'),
        )
        refuse(cantoInTheWay(entry, piece.autoSides, lacking.flatMap(cantoHolds), suggested))
      }
      continue
    }
    const resolved = resolveSpecialEdge({ bandType, alias }, catalog, piece.thickness)
    if (!resolved.ok) {
      refuse(resolved.error)
      continue
    }
    const sides = [...free.long.slice(0, long), ...free.short.slice(0, short)]
    const productId = String(resolved.value.id)
    next = sortBySide([...next, ...sides.map((side) => ({ side, productId }))])
    messages.push({
      message: confirmation(sides, resolved.value, !parsed.value.bandType),
      color: 'success',
    })
  }
  return { next, messages, rejected }
}

// The special edges re-seated for a Canto: each one stays where it is when the Canto leaves its
// side bare, and moves to a bare side of its kind when the Canto takes it — the piece is symmetric,
// so a `1L` special edge on `left` and on `right` are the same piece. null when a kind holds more
// special edges than the Canto leaves sides for: that Canto does not fit the piece.
export const seatSpecialEdges = (
  cantoSides: Record<EdgeSide, boolean>,
  edges: SpecialEdgeForm[],
): SpecialEdgeForm[] | null => {
  const seated: SpecialEdgeForm[] = []
  for (const kind of [LONG_SIDES, SHORT_SIDES]) {
    const bare = kind.filter((s) => !cantoSides[s])
    const own = sortBySide(edges.filter((e) => kind.includes(e.side)))
    if (own.length > bare.length) return null
    const stay = own.filter((e) => bare.includes(e.side))
    const open = bare.filter((s) => !stay.some((e) => e.side === s))
    const moved = own
      .filter((e) => !bare.includes(e.side))
      .map((e, k) => ({ ...e, side: open[k] ?? e.side }))
    seated.push(...stay, ...moved)
  }
  return sortBySide(seated)
}

// Whether a piece with these special edges takes this Canto: the Canto column's options, enabled.
export const cantoFits = (notation: string, edges: SpecialEdgeForm[]): boolean =>
  seatSpecialEdges(sidesFromNotation(notation), edges) !== null

// Why some Canto options are off, for the select's title: what the special edges hold and the most
// the Canto can still band. undefined when the piece has none, and every option fits.
export const cantoLimit = (edges: SpecialEdgeForm[]): string | undefined => {
  if (!edges.length) return undefined
  const held = edges.map((e) => e.side)
  const long = held.filter((s) => LONG_SIDES.includes(s)).length
  const short = held.length - long
  const max = cantoOfCounts(2 - long, 2 - short)
  return max === '—'
    ? 'Los cantos especiales ocupan los cuatro lados: la pieza no admite Canto'
    : `Los cantos especiales ocupan ${sidesNotation(held)}: el Canto puede cubrir hasta ${max}`
}

// After a board change: each special edge keeps its design and type and moves to the width that
// covers the new board. When no stocked width does, the edge is kept as it was — like a tapacanto
// picked by hand — and its tag flags that it does not cover the board.
export const reresolveSpecialEdges = (
  edges: SpecialEdgeForm[],
  catalog: EdgeBandingProduct[],
  thickness: number | undefined,
  byId: Map<string, EdgeBandingProduct>,
): SpecialEdgeForm[] =>
  edges.map((edge) => {
    const product = byId.get(edge.productId)
    const bandType = product?.attributes.bandType as BandType | undefined
    if (!product || !bandType || !aliasOf(product)) return edge
    const resolved = resolveSpecialEdge({ alias: aliasOf(product), bandType }, catalog, thickness)
    return resolved.ok ? { ...edge, productId: String(resolved.value.id) } : edge
  })
