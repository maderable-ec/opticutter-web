import type { SelectOption } from 'src/shared/components/SearchableSelect'
import type { EdgeBandingProduct } from 'src/features/products/types'
import { workshopCodesLine } from 'src/shared/utils/workshopCodes'
import { stripBandingPrefix } from 'src/shared/utils/text'
import { cutSize, type CutSize, type SideBandTypes } from 'src/shared/utils/hardEdges'
import type { BandType, EdgeBandingForm, RequirementForm } from './optimizerForm'
import {
  BANDTYPE_ABBR,
  CANTO_NOTATIONS,
  displayedBandType,
  inferBandingProductId,
  notationFromSides,
  selectedSides,
  sidesFromNotation,
} from './optimizerForm'
import { cantoFits, seatSpecialEdges } from './specialEdges'

// A piece's banding fields as the despiece edits them, and the piece as a list reads it. Two call
// sites edit the same three fields — the grid on a laptop (`PieceRowsTable`) and the sheet on a
// phone (`PieceEditSheet`) — so what each control DOES lives here once: a phone that inferred the
// tapacanto differently from the grid would quote a different job from the same clicks.

// Every tapacanto a piece might reference: the board's coordinated list first, then the whole
// catalogue (a tape picked from it on purpose is not in the coordinated list). Used to read a
// piece's band type off its assigned product.
export const bandingLookup = (
  boardEdgeBandings: EdgeBandingProduct[],
  edgeBandings: EdgeBandingProduct[],
): Map<string, EdgeBandingProduct> => {
  const map = new Map<string, EdgeBandingProduct>()
  for (const p of [...boardEdgeBandings, ...edgeBandings]) map.set(String(p.id), p)
  return map
}

// The Tapacanto choices for a piece: the board's coordinated tapes narrowed to the band type on
// screen, or the whole catalogue when the board has none of that type.
//
// A tape picked from the full catalogue (a deliberate contrast) is not in the coordinated list, and
// an option the select cannot find renders as the placeholder — so the assigned one is appended when
// missing. The label drops the catalogue's "TAPACANTO" prefix (the column already says it); the
// value and the code, which is searchable as the sublabel, keep the product as it is.
export const tapacantoOptions = (
  eb: EdgeBandingForm,
  bandType: '' | BandType,
  boardEdgeBandings: EdgeBandingProduct[],
  edgeBandings: EdgeBandingProduct[],
  byId: Map<string, EdgeBandingProduct>,
): SelectOption[] => {
  const scoped = boardEdgeBandings.filter((p) => !bandType || p.attributes.bandType === bandType)
  const pool = scoped.length ? scoped : edgeBandings
  const options: SelectOption[] = [
    { value: '', label: '— Sin tapacanto —' },
    ...pool.map((p) => ({
      value: String(p.id),
      label: stripBandingPrefix(p.name),
      sublabel: p.code,
    })),
  ]
  const assignedId = String(eb.productId)
  const assigned = assignedId ? byId.get(assignedId) : undefined
  if (assigned && !options.some((o) => o.value === assignedId)) {
    options.push({
      value: assignedId,
      label: stripBandingPrefix(assigned.name),
      sublabel: assigned.code,
    })
  }
  return options
}

// Canto: the sides named by the notation. The first time a piece gets any side, it also gets the
// board's coordinated tapacanto for its type — a banded piece with no tape cannot be quoted.
export const withCantoNotation = (
  eb: EdgeBandingForm,
  notation: string,
  boardEdgeBandings: EdgeBandingProduct[],
): EdgeBandingForm => {
  const sides = sidesFromNotation(notation)
  const next = { ...eb, sides }
  if (Object.values(sides).some(Boolean) && !next.productId) {
    next.productId = inferBandingProductId(boardEdgeBandings, next.bandType)
  }
  return next
}

// The Canto of a whole piece: the notation above, with the piece's special edges re-seated around
// it — a `1L` special edge on `left` moves to `right` when the Canto takes `left`, the same piece.
// null when they do not fit beside it: a special edge adds to the Canto, so per kind the two band at
// most two sides. The select never offers such a Canto (`cantoOptions`); the fills skip the row.
export const withCanto = (
  r: RequirementForm,
  notation: string,
  boardEdgeBandings: EdgeBandingProduct[],
): RequirementForm | null => {
  const edgeBanding = withCantoNotation(r.edgeBanding, notation, boardEdgeBandings)
  const specialEdges = seatSpecialEdges(edgeBanding.sides, r.specialEdges ?? [])
  return specialEdges ? { ...r, edgeBanding, specialEdges } : null
}

export interface CantoOption {
  value: string
  label: string
  disabled: boolean
}

// The Canto select's options for a piece: the ones its special edges leave room for, and the rest
// shown but off, saying why — so the seller sees that `2L` exists and what holds it. `blank` is how
// the select names "no Canto" ('—' in the grid, 'Sin canto' on the phone).
export const cantoOptions = (r: RequirementForm, blank = '—'): CantoOption[] =>
  CANTO_NOTATIONS.map((n) => {
    const disabled = !cantoFits(n, r.specialEdges ?? [])
    const label = n === '—' ? blank : n
    return { value: n, label: disabled ? `${label} — ocupado por canto especial` : label, disabled }
  })

// Tipo: CS/CD, with THREE states. Pressing the type already shown returns to "unstated" (''), where
// the type is read off the assigned tape. The tape follows the type: the board's coordinated one
// for it, or the current one when the board has none.
export const withBandTypeToggle = (
  eb: EdgeBandingForm,
  pressed: BandType,
  shown: '' | BandType,
  boardEdgeBandings: EdgeBandingProduct[],
): EdgeBandingForm => {
  const bandType: '' | BandType = pressed === shown ? '' : pressed
  const productId = inferBandingProductId(boardEdgeBandings, bandType) || eb.productId
  return { ...eb, bandType, productId }
}

// Tapacanto: the tape, with the type kept in step with it so Tipo never contradicts the product.
export const withBandingProduct = (
  eb: EdgeBandingForm,
  productId: string,
  byId: Map<string, EdgeBandingProduct>,
): EdgeBandingForm => {
  const bandType =
    (byId.get(productId)?.attributes.bandType as BandType | undefined) ?? eb.bandType ?? ''
  return { ...eb, productId, bandType }
}

// --- The cut size ---------------------------------------------------------------------------------

// The size the saw cuts a piece at: its final size minus 1 mm per side with a hard tape
// (`shared/utils/hardEdges.ts`). Each side's type is read off the PRODUCT it gets — the Canto's
// tape on its sides, a canto especial's own on its side — exactly as the API reads it; the Tipo
// toggle is not sent, so a CD with no hard tape behind it takes nothing off there either. null
// while a measure is not a positive number.
export const pieceCutSize = (
  r: RequirementForm,
  byId: Map<string, EdgeBandingProduct>,
): CutSize | null => {
  const height = Number(r.height)
  const width = Number(r.width)
  if (!(height > 0) || !(width > 0)) return null
  const types: SideBandTypes = {}
  const auto = byId.get(String(r.edgeBanding.productId))?.attributes.bandType
  for (const side of selectedSides(r.edgeBanding)) types[side] = auto
  for (const e of r.specialEdges ?? []) types[e.side] = byId.get(e.productId)?.attributes.bandType
  return cutSize(height, width, types)
}

// Some row is cut short by a hard tape: the group explains the ✂ once, above its pieces.
export const anyHardCut = (
  rows: RequirementForm[],
  byId: Map<string, EdgeBandingProduct>,
): boolean =>
  rows.some((r) => {
    const cut = pieceCutSize(r, byId)
    return !!cut && cut.heightOff + cut.widthOff > 0
  })

// --- Reading a piece (the phone's list) --------------------------------------------------------

export interface PieceReadout {
  // '' when the piece has none; the list says "Sin etiqueta".
  label: string
  // "720 × 560"; a missing measure reads "?", and a piece with neither is ''.
  dims: string
  // null while the quantity is not a positive number.
  quantity: number | null
  // The Canto column in the shop's notation plus its type ("1L1C CS"); null when unbanded.
  canto: string | null
  // Cantos especiales, counted per TAPE as the grid tags them (two sides in BLN are one).
  specialTapes: number
  // Workshop codes with the service word ("Abis B2 · Ran R1"); '' for none.
  codes: string
  // "600 × 398" when a hard tape cuts the piece short; null when it is cut at its final size.
  cutDims: string | null
}

export const pieceReadout = (
  r: RequirementForm,
  byId: Map<string, EdgeBandingProduct>,
): PieceReadout => {
  const h = String(r.height ?? '').trim()
  const w = String(r.width ?? '').trim()
  const qty = Number(r.quantity)
  const notation = notationFromSides(r.edgeBanding.sides)
  const bandType = displayedBandType(r.edgeBanding, byId)
  const cut = pieceCutSize(r, byId)
  return {
    label: r.label.trim(),
    dims: h || w ? `${h || '?'} × ${w || '?'}` : '',
    quantity: qty > 0 ? qty : null,
    canto: notation === '—' ? null : bandType ? `${notation} ${BANDTYPE_ABBR[bandType]}` : notation,
    specialTapes: new Set((r.specialEdges ?? []).map((e) => e.productId)).size,
    codes: workshopCodesLine(r),
    cutDims: cut && (cut.heightOff || cut.widthOff) ? `${cut.height} × ${cut.width}` : null,
  }
}
