// Format helpers for the public review page.
// Money/date formatting is shared app-wide; `edgesLabel` is review-specific.

import type { ReviewEdges } from './types'

export { fmtMoney, fmtDate, fmtDateTime } from 'src/shared/utils/format'

const SIDE_LABELS: Record<string, string> = {
  top: 'superior',
  bottom: 'inferior',
  left: 'izquierdo',
  right: 'derecho',
}

// `edges` arrives with snake_case keys: { product_id, sides, band_type }.
export const edgesLabel = (edges?: ReviewEdges | null) => {
  if (!edges || !edges.sides?.length) return '—'
  const sides = edges.sides.map((s) => SIDE_LABELS[s] ?? s).join(', ')
  return edges.band_type ? `${sides} · ${edges.band_type}` : sides
}
