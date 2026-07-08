// Shared display formatters (locale es-EC). Use these instead of re-implementing
// Intl formatters per feature. Timestamps are read with `new Date(iso)` (local time);
// for UTC-naive analytics timestamps use `dashboard/format.ts` (`asUtc`, `fmtLocalTime`).

// Intl formatters are expensive to construct, so they are cached at module scope.
const moneyFmtCache = new Map<string, Intl.NumberFormat>()
const moneyFmt = (currency: string): Intl.NumberFormat => {
  let fmt = moneyFmtCache.get(currency)
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency })
    moneyFmtCache.set(currency, fmt)
  }
  return fmt
}

const dateFmt = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Currency amount (defaults to USD); `null`/`undefined` render as an em dash.
export const fmtMoney = (n?: number | null, currency = 'USD'): string =>
  n != null ? moneyFmt(currency).format(n) : '—'

// Date as dd/mm/yyyy; `null`/`undefined`/empty/invalid render as an em dash.
// (`Intl.format` throws on an invalid Date, so we guard it.)
export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

// Date + time as dd/mm/yyyy HH:MM; `null`/`undefined`/empty/invalid render as an em dash.
export const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d)
}

// Person display name: "First Last", falling back to the identifier, then an em dash.
export const clientName = (
  c?: { firstName?: string | null; lastName?: string | null; identifier?: string | null } | null,
): string => [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.identifier || '—'
