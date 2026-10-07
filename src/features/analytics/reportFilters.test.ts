import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  periodSummary,
  presetRange,
  resolvePeriod,
  withRangeEnd,
} from './reportFilters'

// Local time, like the days the presets count: noon on 29 Sep 2026 wherever the suite runs.
const NOW = new Date(2026, 8, 29, 12, 0)
const params = (overrides: Partial<{ period: string; from: string; to: string }> = {}) => ({
  period: '',
  from: '',
  to: '',
  ...overrides,
})

describe('the reports window', () => {
  it('is this month when the URL says nothing', () => {
    expect(resolvePeriod(params(), NOW)).toEqual({
      from: '2026-09-01',
      to: '2026-09-29',
      preset: 'month',
    })
  })

  it('counts local days, so an evening never moves the window to tomorrow', () => {
    // 19:30 in Ecuador is already the next day in UTC: «Este mes» used to start on the 2nd then.
    const evening = new Date(2026, 9, 6, 19, 30)
    expect(resolvePeriod(params({ period: 'month' }), evening)).toEqual({
      from: '2026-10-01',
      to: '2026-10-06',
      preset: 'month',
    })
    expect(presetRange('7d', evening)).toEqual({ from: '2026-09-29', to: '2026-10-06' })
  })

  it('computes a preset on the day it is opened, not the day it was saved', () => {
    expect(resolvePeriod(params({ period: '7d' }), NOW)).toEqual({
      from: '2026-09-22',
      to: '2026-09-29',
      preset: '7d',
    })
    expect(resolvePeriod(params({ period: '30d' }), NOW).from).toBe('2026-08-30')
    expect(resolvePeriod(params({ period: '90d' }), NOW).from).toBe('2026-07-01')
  })

  it('keeps a range picked by hand, with no preset selected', () => {
    expect(resolvePeriod(params({ from: '2026-06-01', to: '2026-06-30' }), NOW)).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
      preset: null,
    })
  })

  it('shows a preset as selected when a hand-picked range covers exactly its days', () => {
    const { from, to } = presetRange('7d', NOW)
    expect(resolvePeriod(params({ from, to }), NOW).preset).toBe('7d')
  })

  it('falls back to the default rather than ask the API for a range it rejects', () => {
    for (const bad of [
      { from: '2026-09-10', to: '2026-09-01' },
      { from: '2026-09-10' },
      { from: 'ayer', to: '2026-09-01' },
      { period: 'semana' },
    ]) {
      expect(resolvePeriod(params(bad), NOW).preset, JSON.stringify(bad)).toBe('month')
    }
  })

  it('drags the other end along when one end is moved past it', () => {
    const range = { from: '2026-09-01', to: '2026-09-10' }
    expect(withRangeEnd(range, 'from', '2026-09-05')).toEqual({
      from: '2026-09-05',
      to: '2026-09-10',
    })
    expect(withRangeEnd(range, 'from', '2026-09-20')).toEqual({
      from: '2026-09-20',
      to: '2026-09-20',
    })
    expect(withRangeEnd(range, 'to', '2026-08-20')).toEqual({
      from: '2026-08-20',
      to: '2026-08-20',
    })
  })

  it('names a preset in words and a hand-picked range by its days', () => {
    expect(periodSummary(resolvePeriod(params({ period: '90d' }), NOW))).toBe('Últimos 90 días')
    expect(periodSummary({ from: '2026-06-01', to: '2026-06-30', preset: null })).toBe(
      '01/06/2026 – 30/06/2026',
    )
  })
})

describe('the phone’s «Filtros» badge', () => {
  const window = { preset: 'month' as const, granularity: 'day' as const }

  it('counts the filters away from their default, leaving the presets out', () => {
    expect(activeFilterCount(window, { granularity: true })).toBe(0)
    expect(activeFilterCount({ ...window, preset: '7d' }, { granularity: true })).toBe(0)
    expect(activeFilterCount({ ...window, preset: null, branchId: 2 }, {})).toBe(2)
  })

  it('leaves the branch out where the report compares every branch', () => {
    expect(activeFilterCount({ ...window, branchId: 2 }, {})).toBe(1)
    expect(activeFilterCount({ ...window, branchId: 2 }, { branch: false })).toBe(0)
  })

  it('counts only the fields the report shows', () => {
    // A role carried over from Productividad to Resumen has nothing to clear it from there.
    const carried = { ...window, granularity: 'week' as const, role: 'operador' as const }
    expect(activeFilterCount(carried, { granularity: true })).toBe(1)
    expect(activeFilterCount(carried, { role: true })).toBe(1)
    expect(activeFilterCount(carried, { granularity: true, role: true })).toBe(2)
  })
})
