// Helpers de formato para la página pública de revisión.
// Las fechas vienen en UTC sin sufijo de zona; las mostramos en formato local legible.

import type { ReviewEdges } from './types'

export const fmtMoney = (n?: number | null, currency = 'USD') =>
  n != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n) : '—'

export const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
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

// `edges` viene con claves en snake_case: { product_id, sides, band_type }.
export const edgesLabel = (edges?: ReviewEdges | null) => {
  if (!edges || !edges.sides?.length) return '—'
  const sides = edges.sides.map((s) => SIDE_LABELS[s] ?? s).join(', ')
  return edges.band_type ? `${sides} · ${edges.band_type}` : sides
}
