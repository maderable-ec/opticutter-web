// Format helpers for analytics views.
// Durations arrive in hours (float). Timestamps are UTC naive (no offset,
// e.g. "2026-06-15T08:05:00") → must be treated as UTC and displayed in local time.

import { fmtNumber, fmtPercent } from 'src/shared/utils/format'
import type { Granularity } from './types'

// The reports' precisions over the app's figures (`shared/utils/format.ts`, es-EC like the money).
// A money axis: whole dollars, the cents would only crowd the ticks.
const moneyTickFmt = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export const fmtInt = (n: number) => fmtNumber(n)
export const fmtDecimal = (n: number) => fmtNumber(n, 1)
export const fmtRate = (n: number) => fmtNumber(n, 2)
export const fmtMoneyTick = (n: number) => moneyTickFmt.format(n)
// A ratio the API sends as 0-1 (`cancellationRate`).
export const fmtRatio = (ratio: number) => fmtPercent(ratio * 100)
// An hours axis: «1,5 h», with no forced decimal on the whole ones.
const hoursTickFmt = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 })
export const fmtHoursTick = (n: number) => `${hoursTickFmt.format(n)} h`

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
// 24-hour, the clock the lateness threshold is typed in: «08:22», where es-EC's default was
// «08:22 a. m.», twice as wide in a matrix of thirty columns.
export const fmtLocalTime = (iso?: string | null): string =>
  iso
    ? asUtc(iso).toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
    : '—'

// Local "HH:MM" in 24h zero-padded format, used to compare against a lateness
// threshold also expressed as "HH:MM".
export const localHHMM = (iso: string): string => {
  const d = asUtc(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Minutes after local midnight (the API's average start/end of the workday) → «08:24».
export const fmtMinuteOfDay = (minutes: number): string => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(Math.round(minutes % 60)).padStart(2, '0')
  return `${hh}:${mm}`
}

// A business day 'YYYY-MM-DD' → «mar 06/10», read in local parts: `new Date('2026-10-06')` is UTC
// midnight, which in Ecuador is still the 5th.
const weekdayFmt = new Intl.DateTimeFormat('es-EC', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
})
export const fmtWeekday = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number)
  return y && m && d ? weekdayFmt.format(new Date(y, m - 1, d)) : day
}

// One part of a whole as a percentage with no decimals («58 %»); nothing when the whole is zero.
export const fmtShare = (part: number, whole: number): string | undefined =>
  whole > 0 ? fmtPercent((part / whole) * 100, 0) : undefined
