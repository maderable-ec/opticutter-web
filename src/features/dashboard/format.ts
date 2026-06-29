// Helpers de formato para las vistas de analítica.
// Las duraciones llegan en horas (float). Los timestamps son UTC naive (sin
// offset, p. ej. "2026-06-15T08:05:00") → hay que interpretarlos como UTC y
// mostrarlos en hora local.

// Duración en horas → texto legible. `>=48h` se muestra en días; si no, en
// horas y minutos (omitiendo el `0h`). Valores <= 0 caen a "0 m".
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

// Un timestamp UTC naive (sin sufijo `Z`) que `new Date(...)` interpretaría como
// hora local. Le agregamos `Z` para forzar la lectura como UTC.
const asUtc = (iso: string): Date => new Date(/[zZ]$/.test(iso) ? iso : `${iso}Z`)

// Hora local "HH:MM" de un timestamp UTC naive (para mostrar la hora de entrada).
export const fmtLocalTime = (iso?: string | null): string =>
  iso ? asUtc(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'

// Fecha + hora local de un timestamp UTC naive.
export const fmtLocalDateTime = (iso?: string | null): string =>
  iso
    ? asUtc(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

// "HH:MM" en hora local (24h, zero-padded) para comparar contra un umbral de
// tardanza también expresado como "HH:MM".
export const localHHMM = (iso: string): string => {
  const d = asUtc(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
