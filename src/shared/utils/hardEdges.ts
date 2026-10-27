// The cut size of a piece: its final size minus what its hard tapes add. A hard tape (PVC 1–1.5 mm)
// makes the piece thicker across the side it is glued on, so the saw cuts that side short — by the
// setting's millimetres (`cutRules.ts`, 1 by default) — for the piece to come out at the size the
// seller typed. The seller ALWAYS types the final size; the
// API cuts the piece short (`opticutter-api/src/modules/optimizations/hard_edges.py`) and this is
// its mirror, only so the despiece can show the cut size live, before anything is optimized. Keep
// the two in step.
//
// The axis is the physical one: a tape on a long side (`left`/`right`, the `L` of the notation)
// adds across the WIDTH, one on a short side (`top`/`bottom`, `C`) across the HEIGHT. At 1 mm,
// 600×400 with `2L CD` is cut 600×398; with `1C CD`, 599×400. What makes a side hard is the tape's PRODUCT
// (`attributes.bandType`), the same thing the API reads — never the grid's CS/CD toggle, which is
// not sent.

import type { DrawablePiece, EdgeSide } from './cutDrawing'

const HEIGHT_SIDES: EdgeSide[] = ['top', 'bottom']
const WIDTH_SIDES: EdgeSide[] = ['left', 'right']

// A banded side's tape type: `Hard`, `Soft`, or unknown (no product yet).
export type SideBandTypes = Partial<Record<EdgeSide, string | null | undefined>>

export interface CutSize {
  height: number
  width: number
  // Millimetres taken off each measure: 0, one or two sides' worth.
  heightOff: number
  widthOff: number
}

const hardCount = (sides: EdgeSide[], types: SideBandTypes) =>
  sides.filter((s) => types[s] === 'Hard').length

// A piece too small to take its discount keeps its size, as in the API (it coerces, never raises).
const shorten = (size: number, hardSides: number, hardMm: number) => {
  const cut = size - hardSides * hardMm
  return cut > 0 ? cut : size
}

// `hardMm`: the setting, millimetres per hard side (`CutRules.hardEdgeCutMm`).
export const cutSize = (
  height: number,
  width: number,
  types: SideBandTypes,
  hardMm: number,
): CutSize => {
  const h = shorten(height, hardCount(HEIGHT_SIDES, types), hardMm)
  const w = shorten(width, hardCount(WIDTH_SIDES, types), hardMm)
  return { height: h, width: w, heightOff: height - h, widthOff: width - w }
}

// "2 cantos duros" — how many hard tapes took `off` millimetres off a measure, at `hardMm` each.
export const hardTapes = (off: number, hardMm: number): string => {
  const count = hardMm > 0 ? Math.round(off / hardMm) : 0
  return count === 1 ? '1 canto duro' : `${count} cantos duros`
}

// «Se corta a 398 mm: 400 − 2 mm por 2 cantos duros.» — what the ✂ next to a measure explains.
export const cutHint = (final: number, cut: number, hardMm: number): string => {
  const off = final - cut
  return `Se corta a ${cut} mm: ${final} − ${off} mm por ${hardTapes(off, hardMm)}. Escribe siempre la medida final.`
}

// A placed piece's own (unrotated) cut size, against the size it was ordered at. The API places a
// piece at its CUT size (`width`/`height`) and keeps the ordered one in `original*`: the two agree
// for every piece no hard tape shortened, and for any plan made before the rule existed.
export const placedCut = (
  p: Pick<DrawablePiece, 'width' | 'height' | 'originalWidth' | 'originalHeight' | 'rotated'>,
): CutSize => {
  const height = Math.round(p.rotated ? p.width : p.height)
  const width = Math.round(p.rotated ? p.height : p.width)
  return {
    height,
    width,
    heightOff: Math.round(p.originalHeight) - height,
    widthOff: Math.round(p.originalWidth) - width,
  }
}

export const isCutShort = (cut: CutSize): boolean => cut.heightOff > 0 || cut.widthOff > 0

// Cut at any size other than the ordered one: shorter (a hard tape) or larger (a layer of an
// assembly, `assembly.ts`), or both on different measures.
export const isResized = (cut: CutSize): boolean => cut.heightOff !== 0 || cut.widthOff !== 0

// Grown on some measure: a layer of an assembly. A hard tape only ever takes off.
export const isEnlarged = (cut: CutSize): boolean => cut.heightOff < 0 || cut.widthOff < 0
