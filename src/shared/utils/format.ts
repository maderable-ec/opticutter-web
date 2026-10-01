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

// Figures in the app's locale, the same as the money beside them: «5,246 m²», never «5.246 m²» —
// with a dot, es-EC reads that as five thousand. `toFixed` printed the dot in 25 places.
const numberFmtCache = new Map<string, Intl.NumberFormat>()
const numberFmt = (min: number, max: number): Intl.NumberFormat => {
  const key = `${min}-${max}`
  let fmt = numberFmtCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    })
    numberFmtCache.set(key, fmt)
  }
  return fmt
}

// A number and its unit never part at the end of a line: «11,00 m», not «11,00» and «m» below it.
const NBSP = ' '

// A figure with `digits` decimals; pass a smaller `minDigits` to drop trailing zeros («3,4», «3»).
// es-EC groups thousands from four digits («2.440»), so this is NEVER for a measure in mm: those
// are whole numbers the shop reads as printed («2440 × 1220»).
export const fmtNumber = (n?: number | null, digits = 0, minDigits = digits): string =>
  n != null ? numberFmt(minDigits, digits).format(n) : '—'

// A percentage the API sends as 0-100 (`efficiency`): «65,0 %».
export const fmtPercent = (pct?: number | null, digits = 1): string =>
  pct != null ? `${fmtNumber(pct, digits)}${NBSP}%` : '—'

// Linear metres (cut, edge banding, stock): «11,00 m».
export const fmtMeters = (m?: number | null, digits = 2, minDigits = digits): string =>
  m != null ? `${fmtNumber(m, digits, minDigits)}${NBSP}m` : '—'

// Square metres: «5,25 m²».
export const fmtM2 = (m2?: number | null, digits = 2, minDigits = digits): string =>
  m2 != null ? `${fmtNumber(m2, digits, minDigits)}${NBSP}m²` : '—'

// An upload's size: bytes, whole KB under a megabyte, one decimal above.
export const fmtFileSize = (bytes: number): string =>
  bytes < 1024
    ? `${bytes}${NBSP}B`
    : bytes < 1_048_576
      ? `${fmtNumber(bytes / 1024)}${NBSP}KB`
      : `${fmtNumber(bytes / 1_048_576, 1)}${NBSP}MB`

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
