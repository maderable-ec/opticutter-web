import type { Role } from 'src/features/auth/types'
import { fmtDay, formatDate, subDays } from 'src/shared/utils/date'
import type { Granularity } from './types'

// The window every report looks through, read off the URL. Four screens each kept the same four
// `useState`s (from, to, branch, granularity), which is why a reload, a shared link or the way back
// from a record always landed on «the last 30 days, all branches» whatever the admin had picked.
//
// A preset is stored as itself (`?period=7d`), not as the two dates it covers: a bookmark of «the
// last 7 days» has to mean the last 7 days on the day it is opened. A hand-picked range is stored as
// its two days (`?from=…&to=…`). With neither, the report shows the last 30 days, as it always did.
//
// Days are UTC calendar days (`formatDate`), the same days the API cuts `created_at` by.

export type PeriodPreset = '7d' | '30d' | '90d' | 'month'

export const PERIOD_PRESETS: { id: PeriodPreset; label: string; summary: string }[] = [
  { id: '7d', label: '7 días', summary: 'Últimos 7 días' },
  { id: '30d', label: '30 días', summary: 'Últimos 30 días' },
  { id: '90d', label: '90 días', summary: 'Últimos 90 días' },
  { id: 'month', label: 'Este mes', summary: 'Este mes' },
]

export const DEFAULT_PRESET: PeriodPreset = '30d'

export const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
]

export const DEFAULT_GRANULARITY: Granularity = 'day'

// «por día», for a chart's title.
export const GRANULARITY_NOUN: Record<Granularity, string> = {
  day: 'día',
  week: 'semana',
  month: 'mes',
}

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'operador', label: 'Operador' },
  { value: 'canteador', label: 'Canteador' },
]

// The URL keys, in one place: the hook writes them and «Restablecer» clears them.
export const REPORT_PARAMS = ['period', 'from', 'to', 'branchId', 'granularity', 'role'] as const

const startOfMonth = (now: Date) => {
  const d = new Date(now)
  d.setDate(1)
  return d
}

// The two days a preset covers today. The same arithmetic the presets always did.
export const presetRange = (preset: PeriodPreset, now = new Date()) => {
  const to = formatDate(now)
  switch (preset) {
    case '7d':
      return { from: formatDate(subDays(now, 7)), to }
    case '90d':
      return { from: formatDate(subDays(now, 90)), to }
    case 'month':
      return { from: formatDate(startOfMonth(now)), to }
    default:
      return { from: formatDate(subDays(now, 30)), to }
  }
}

const isPreset = (value: string): value is PeriodPreset =>
  PERIOD_PRESETS.some((p) => p.id === value)

const DAY = /^\d{4}-\d{2}-\d{2}$/
const isDay = (value: string) => DAY.test(value) && !Number.isNaN(Date.parse(value))

export interface ResolvedPeriod {
  from: string
  to: string
  // The preset the window IS, or null for a range picked by hand. A hand-picked range that happens
  // to cover exactly what a preset does shows that preset as selected: it is the same window.
  preset: PeriodPreset | null
}

export const resolvePeriod = (
  params: { period: string; from: string; to: string },
  now = new Date(),
): ResolvedPeriod => {
  if (isPreset(params.period)) return { ...presetRange(params.period, now), preset: params.period }
  // A range the API would reject (`from` after `to`, or a day that is not one) never reaches it.
  if (isDay(params.from) && isDay(params.to) && params.from <= params.to) {
    const match = PERIOD_PRESETS.find((p) => {
      const range = presetRange(p.id, now)
      return range.from === params.from && range.to === params.to
    })
    return { from: params.from, to: params.to, preset: match?.id ?? null }
  }
  return { ...presetRange(DEFAULT_PRESET, now), preset: DEFAULT_PRESET }
}

// The new range after one of its two ends is typed. Moving one end past the other drags the other
// along, so the report never asks for a window the API answers with a 422.
export const withRangeEnd = (
  range: { from: string; to: string },
  end: 'from' | 'to',
  day: string,
): { from: string; to: string } => {
  if (end === 'from') return { from: day, to: day > range.to ? day : range.to }
  return { from: day < range.from ? day : range.from, to: day }
}

// «Últimos 30 días», or the two days of a hand-picked range.
export const periodSummary = (period: ResolvedPeriod): string => {
  const preset = PERIOD_PRESETS.find((p) => p.id === period.preset)
  return preset ? preset.summary : `${fmtDay(period.from)} – ${fmtDay(period.to)}`
}

// The filters the phone's «Filtros» badge counts: those away from their default among the fields
// this report shows. The period is left out, since its presets are on screen beside the button. A
// report counts only its own fields because the tabs of Estadísticas carry every key: a role picked
// on Productividad rides along to Resumen, which has no role field to clear it from.
export const activeFilterCount = (
  filters: {
    preset: PeriodPreset | null
    branchId?: number
    granularity: Granularity
    role?: Role
  },
  shown: { granularity?: boolean; role?: boolean },
): number =>
  [
    filters.preset === null,
    filters.branchId !== undefined,
    shown.granularity === true && filters.granularity !== DEFAULT_GRANULARITY,
    shown.role === true && filters.role !== undefined,
  ].filter(Boolean).length
