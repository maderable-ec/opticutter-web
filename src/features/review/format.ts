// Format helpers for the public review page.
// Money/date formatting is shared app-wide; `edgesLabel` is review-specific.

import { notationFromSides } from 'src/features/optimizer/optimizerForm'
import type { CantoSides } from 'src/shared/components/CantoPreview'
import type { ReviewEdges } from './types'

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

// `edges` arrives with snake_case keys: { product_id, sides, band_type }.
export const edgesLabel = (edges?: ReviewEdges | null) => {
  if (!edges || !edges.sides?.length) return '—'
  const sides = edges.sides.map((s) => SIDE_LABELS[s] ?? s).join(', ')
  const band = edges.band_type ? (BAND_LABEL[edges.band_type.toLowerCase()] ?? edges.band_type) : ''
  return band ? `${sides} · ${band}` : sides
}

// The banded sides as a boolean record, for the shared <CantoPreview> figure.
export const cantoSides = (edges?: ReviewEdges | null): CantoSides => ({
  top: !!edges?.sides?.includes('top'),
  bottom: !!edges?.sides?.includes('bottom'),
  left: !!edges?.sides?.includes('left'),
  right: !!edges?.sides?.includes('right'),
})

// Business notation shown next to the figure, e.g. "2L1C CD" (2 long + 1 short sides, canto duro).
// Reuses the optimizer's canonical L/C notation so it matches the quote view exactly.
export const cantoNotation = (edges?: ReviewEdges | null): string => {
  if (!edges || !edges.sides?.length) return '—'
  const notation = notationFromSides(cantoSides(edges))
  const band = edges.band_type ? BAND_ABBR[edges.band_type.toLowerCase()] : ''
  return band ? `${notation} ${band}` : notation
}
