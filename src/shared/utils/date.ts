// Generic date helpers. Analytics-specific formatting (UTC-naive handling, bucket labels,
// duration in hours) lives in `dashboard/format.ts`.

// A Date → ISO calendar day 'YYYY-MM-DD' (UTC). Used for API date-range params and <input type="date">.
export const formatDate = (date: Date): string => date.toISOString().slice(0, 10)

// A new Date `n` days before `date` (does not mutate the input).
export const subDays = (date: Date, n: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

// Human-readable "time ago" in Spanish: 'ahora', 'hace 5 min', 'hace 2 h', 'hace 3 d'.
export const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hours = Math.round(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return `hace ${days} d`
}
