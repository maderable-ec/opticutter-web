import type { SelectOption } from 'src/shared/components/SearchableSelect'
import type { EdgeBandingProduct } from 'src/features/products/types'
import { workshopCodesLine } from 'src/shared/utils/workshopCodes'
import { stripBandingPrefix } from 'src/shared/utils/text'
import type { BandType, EdgeBandingForm, RequirementForm } from './optimizerForm'
import {
  BANDTYPE_ABBR,
  displayedBandType,
  inferBandingProductId,
  notationFromSides,
  sidesFromNotation,
} from './optimizerForm'

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
  return {
    label: r.label.trim(),
    dims: h || w ? `${h || '?'} × ${w || '?'}` : '',
    quantity: qty > 0 ? qty : null,
    canto: notation === '—' ? null : bandType ? `${notation} ${BANDTYPE_ABBR[bandType]}` : notation,
    specialTapes: new Set((r.specialEdges ?? []).map((e) => e.productId)).size,
    codes: workshopCodesLine(r),
  }
}
