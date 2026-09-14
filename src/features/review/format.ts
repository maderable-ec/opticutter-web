// Format helpers for the public review page.
// Money/date formatting is shared app-wide; `edgesLabel` is review-specific.
//
// The three edge helpers below read `sides` in the piece's NOMINAL frame — that's what
// `notationFromSides` counts as L (left/right) and C (top/bottom). The cut list's edges are
// nominal already, but a placed piece's `sides` come rotated into the frame of the drawing, so
// pass its `nominalSides` instead: otherwise every rotated piece reads its 1L as a 1C.

import { apiErrorMessage } from 'src/shared/api/errors'
import { notationFromSides } from 'src/features/optimizer/optimizerForm'
import type { CantoSides } from 'src/shared/components/CantoPreview'

export { fmtMoney, fmtDate, fmtDateTime } from 'src/shared/utils/format'

const SIDE_LABELS: Record<string, string> = {
  top: 'superior',
  bottom: 'inferior',
  left: 'izquierdo',
  right: 'derecho',
}

// band_type → abbreviation: canto suave (CS) / canto duro (CD). The server's canonical BandType
// values are "Soft"/"Hard"; the Spanish "Suave"/"Duro" are accepted too, case-insensitively.
const BAND_ABBR: Record<string, string> = { soft: 'CS', hard: 'CD', suave: 'CS', duro: 'CD' }
// band_type → Spanish label for the tooltip.
const BAND_LABEL: Record<string, string> = {
  soft: 'Suave',
  hard: 'Duro',
  suave: 'Suave',
  duro: 'Duro',
}

// Two shapes reach these helpers: the cut list's `edges` is a raw dict the server passes through
// untouched (snake_case), while the diagram's comes from a typed schema (camelCase). One accessor
// so no caller has to care which it holds.
type AnyEdges =
  | {
      sides?: string[]
      band_type?: string | null
      bandType?: string | null
      productName?: string | null
    }
  | null
  | undefined

const bandTypeOf = (edges: AnyEdges): string | null =>
  (edges && ('band_type' in edges ? edges.band_type : null)) ?? edges?.bandType ?? null

export const edgesLabel = (edges?: AnyEdges) => {
  if (!edges || !edges.sides?.length) return '—'
  const sides = edges.sides.map((s) => SIDE_LABELS[s] ?? s).join(', ')
  const bandType = bandTypeOf(edges)
  const band = bandType ? (BAND_LABEL[bandType.toLowerCase()] ?? bandType) : ''
  return band ? `${sides} · ${band}` : sides
}

// The banded sides as a boolean record, for the shared <CantoPreview> figure.
export const cantoSides = (edges?: AnyEdges): CantoSides => ({
  top: !!edges?.sides?.includes('top'),
  bottom: !!edges?.sides?.includes('bottom'),
  left: !!edges?.sides?.includes('left'),
  right: !!edges?.sides?.includes('right'),
})

// Business notation shown next to the figure, e.g. "2L1C CD" (2 long + 1 short sides, canto duro).
// Reuses the optimizer's canonical L/C notation so it matches the quote view exactly.
export const cantoNotation = (edges?: AnyEdges): string => {
  if (!edges || !edges.sides?.length) return '—'
  const notation = notationFromSides(cantoSides(edges))
  const bandType = bandTypeOf(edges)
  const band = bandType ? BAND_ABBR[bandType.toLowerCase()] : ''
  return band ? `${notation} ${band}` : notation
}

// The catalogue prefixes every single tapacanto with the word itself
// ("TAPACANTO IBIZA 19X0.40MM") — 10 of 25 characters, under a label that
// already says what this is. What identifies the tape is the design and the
// size, so that is what gets the room; the full name rides on the cell's
// `title` and on the piece detail.
export const bandingName = (edges?: AnyEdges): string | null => {
  const name = edges?.productName?.trim()
  if (!name) return null
  return name.replace(/^tapacantos?\s+/i, '') || name
}

// The client never sees a status code. `apiErrorMessage` prefers the server's own
// message — which is what we want — but falls through to `error.message`, and for a
// response carrying no error envelope `httpClient` synthesizes that as `HTTP 500`.
export const reviewErrorMessage = (error: Error | null, fallback: string): string | null => {
  const message = apiErrorMessage(error, fallback)
  return message ? message.replace(/^HTTP \d+$/, fallback) : null
}

// Largo first, like every measurement the client reads on this page. `SheetSvg`'s own
// default is `ancho×largo`, which on a rotated piece contradicted the cut list right
// beside it.
export const pieceTitle = (p: {
  originalWidth: number
  originalHeight: number
  rotated: boolean
}): string => `${p.originalHeight}×${p.originalWidth} mm${p.rotated ? ' (rotada 90°)' : ''}`
