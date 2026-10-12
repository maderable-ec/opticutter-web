// The shop's working hours, as Configuración edits them. The statistics read the cut's and the
// banding's time against this schedule on the server (`shared/work_schedule.py`); what lives here
// is the form: the days in order, what makes a schedule valid (the API's own rules, so the form
// says it before the 422 does) and how much a week adds up to.

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

// One stretch of working hours on the shop's wall clock, `HH:MM`.
export interface TimeWindow {
  start: string
  end: string
}

// A day with no window is a day the shop is closed.
export type WorkSchedule = Record<DayKey, TimeWindow[]>

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

// The API takes three; more in one day is a typo, not a shift pattern.
export const MAX_WINDOWS = 3

const minutes = (clock: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(clock)
  if (!match) return null
  const total = Number(match[1]) * 60 + Number(match[2])
  return Number(match[2]) < 60 && total <= 24 * 60 ? total : null
}

/** What is wrong with a day's windows, or `undefined`. In the order the fields read. */
export const dayError = (windows: TimeWindow[]): string | undefined => {
  const spans: [number, number][] = []
  for (const window of windows) {
    const start = minutes(window.start)
    const end = minutes(window.end)
    if (start === null || end === null) return 'Completa la hora de inicio y la de fin.'
    if (end <= start) return 'Cada franja debe terminar después de empezar.'
    spans.push([start, end])
  }
  spans.sort((a, b) => a[0] - b[0])
  for (let i = 1; i < spans.length; i++) {
    const current = spans[i]
    const previous = spans[i - 1]
    if (current && previous && current[0] < previous[1])
      return 'Las franjas del día no pueden solaparse.'
  }
  return undefined
}

/** The days that cannot be saved, each with its reason. Empty when the schedule is valid. */
export const scheduleErrors = (schedule: WorkSchedule): Partial<Record<DayKey, string>> => {
  const errors: Partial<Record<DayKey, string>> = {}
  for (const { key } of DAYS) {
    const error = dayError(schedule[key])
    if (error) errors[key] = error
  }
  return errors
}

/** Hours the shop works in a week, for the line under the form: «49 h a la semana». */
export const weeklyHours = (schedule: WorkSchedule): number => {
  let total = 0
  for (const { key } of DAYS) {
    for (const window of schedule[key]) {
      const start = minutes(window.start)
      const end = minutes(window.end)
      if (start !== null && end !== null && end > start) total += end - start
    }
  }
  return total / 60
}

export const sameSchedule = (a: WorkSchedule, b: WorkSchedule): boolean =>
  DAYS.every(
    ({ key }) =>
      a[key].length === b[key].length &&
      a[key].every((w, i) => w.start === b[key][i]?.start && w.end === b[key][i]?.end),
  )

/** A window to start a day's next stretch with: after the last one, or the morning. */
export const nextWindow = (windows: TimeWindow[]): TimeWindow => {
  const last = windows.at(-1)
  return last ? { start: last.end, end: last.end } : { start: '08:00', end: '13:00' }
}
