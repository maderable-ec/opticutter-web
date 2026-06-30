// Format helpers for the public review page.
// Dates arrive in UTC without a timezone suffix; we display them in human-readable local format.

import type { ReviewEdges } from './types'

export const fmtMoney = (n?: number | null, currency = 'USD') =>
  n != null ? new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(n) : '—'

export const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

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
