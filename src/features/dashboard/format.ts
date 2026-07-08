// Format helpers for analytics views.
// Durations arrive in hours (float). Timestamps are UTC naive (no offset,
// e.g. "2026-06-15T08:05:00") → must be treated as UTC and displayed in local time.

import type { Granularity } from './types'

// A time-bucket 'YYYY-MM-DD' → human label depending on the chart granularity.
export const fmtBucketLabel = (bucket: string, granularity: Granularity): string => {
  const date = new Date(`${bucket}T00:00:00`)
  if (granularity === 'month') {
    return date.toLocaleDateString('es', { month: 'short', year: 'numeric' })
  }
  if (granularity === 'week') {
    return `Sem. del ${date.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
  }
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// Duration in hours → human-readable text. `>=48h` is shown in days; otherwise
// hours and minutes (omitting `0h`). Values <= 0 fall back to "0 m".
export const fmtHours = (h: number): string => {
  if (h >= 48) {
    const days = Math.floor(h / 24)
    const rem = Math.round(h % 24)
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`
  }
  const totalMin = Math.round(h * 60)
  const hh = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  if (hh === 0) return `${mm}m`
  if (mm === 0) return `${hh}h`
  return `${hh}h ${mm}m`
}

// A UTC naive timestamp (no `Z` suffix) that `new Date(...)` would interpret as
// local time. We append `Z` to force it to be read as UTC.
const asUtc = (iso: string): Date => new Date(/[zZ]$/.test(iso) ? iso : `${iso}Z`)

// Local "HH:MM" time from a UTC naive timestamp (used to display check-in time).
export const fmtLocalTime = (iso?: string | null): string =>
  iso ? asUtc(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'

// Local "HH:MM" in 24h zero-padded format, used to compare against a lateness
// threshold also expressed as "HH:MM".
export const localHHMM = (iso: string): string => {
  const d = asUtc(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
