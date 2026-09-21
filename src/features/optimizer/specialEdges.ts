// Entry of the "Cantos especiales" column: `2L CS BLN` → a count of sides, a band type and an alias,
// resolved against the catalog to the one tapacanto those sides will carry. It is the Canto column's
// own notation on purpose, so the seller writes one language: `2L CS BLN` puts both long sides on
// BLN, and two long sides on DIFFERENT tapes are two entries, `1L CS BLN` then `1L CS CHM`. Each
// count COMPLETES before it replaces: it takes the sides of its kind that have no edge at all, and
// only once those run out the ones the auto banding covers — a `2L1C` piece plus `1C BLN` is banded
// on all four sides, not re-coloured on the one it had. Within each group `1L` is `left` and `1C` is
// `top`, as in the Canto column. The type may
// be left out (`1L BLN`): the entry then takes the piece's own, since the common case is changing
// the colour of a side, not its type. Pure — the cell turns what comes back into tags and toasts.
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
} from './optimizerForm'
import type { BandType, SpecialEdgeForm } from './optimizerForm'
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

export const specialEdgeFits = (
  product: EdgeBandingProduct | undefined,
  thickness: number | undefined,
): boolean => !product || edgeWidthFitsBoard(thickness, product.attributes.width)

export interface SpecialEdgeMessage {
  message: string
  color: 'success' | 'warning'
}

// Where the entry landed, because it is not always where the seller pictured it: on sides that had
// no edge, in place of the piece's own, or both.
const placement = (sides: EdgeSide[], autoSides: Set<EdgeSide>): string => {
  const added = sides.filter((s) => !autoSides.has(s))
  const replaced = sides.filter((s) => autoSides.has(s))
  if (replaced.length === 0) {
    return `${sidesDescription(sides)} que no ${sides.length > 1 ? 'tenían' : 'tenía'} canto`
  }
  if (added.length === 0) return `${sidesDescription(sides)}, en lugar del canto de la pieza`
  return `completa ${sidesDescription(added)} y reemplaza ${sidesDescription(replaced)}`
}

const confirmation = (
  sides: EdgeSide[],
  product: EdgeBandingProduct,
  inherited: boolean,
  autoSides: Set<EdgeSide>,
): string => {
  const bandType = product.attributes.bandType as BandType | undefined
  const type = bandType
    ? ` · canto ${BANDTYPE_LABEL[bandType].toLowerCase()} (${BANDTYPE_ABBR[bandType]}${inherited ? ', el de la pieza' : ''})`
    : ''
  return (
    `Canto especial ${sidesNotation(sides)} (${placement(sides, autoSides)})${type}: ` +
    `${stripBandingPrefix(product.name)} (${product.code})`
  )
}

const KIND_WORDS = { long: 'lados largos', short: 'lados cortos' } as const

// Why an entry did not fit: nothing of its kind is free, or it asked for both and one is taken.
const noRoom = (entry: string, kind: 'long' | 'short', free: number): string =>
  free === 0
    ? `«${entry}»: ya no quedan ${KIND_WORDS[kind]} libres; quita el tag que los ocupa para cambiarlos`
    : `«${entry}» pide los dos ${KIND_WORDS[kind]} y solo queda uno libre; quita el tag que ocupa el otro`

// What an entry needs to know about its piece.
export interface SpecialEdgePiece {
  // Board thickness (catalog boards only), to pick the width that covers the edge.
  thickness?: number
  // The piece's own type (the Tipo column, or the one of its tapacanto): what an entry with no
  // CS/CD takes. '' when the piece has none.
  bandType: BandType | ''
  // The sides the Canto column bands: an entry fills the OTHER ones first.
  autoSides: EdgeSide[]
}

// The sides of one kind an entry may take, in the order it takes them: those with no edge at all,
// then those the auto banding covers — completing comes before replacing. A side that already
// carries a special edge is never offered.
const freeSides = (kind: EdgeSide[], taken: Set<EdgeSide>, autoSides: Set<EdgeSide>) => {
  const open = kind.filter((s) => !taken.has(s))
  return [...open.filter((s) => !autoSides.has(s)), ...open.filter((s) => autoSides.has(s))]
}

// Applies what the seller typed. Several entries may come at once, separated by commas or
// semicolons; each one is accepted or refused on its own, and every outcome gets a message — the
// confirmation names the real product and says where it landed, a refusal says exactly what to
// fix. A side that already carries a special edge is never overwritten: the seller removes that
// tag to change it.
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
    const lacking = (['long', 'short'] as const).find(
      (kind) => free[kind].length < parsed.value[kind],
    )
    if (lacking) {
      refuse(noRoom(entry, lacking, free[lacking].length))
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
      message: confirmation(sides, resolved.value, !parsed.value.bandType, autoSides),
      color: 'success',
    })
  }
  return { next, messages, rejected }
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
