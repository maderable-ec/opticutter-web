import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { statusDetail } from './productionState'
import type { BranchProductionStatus } from './types'

// Local time: 15:00 on 6 Oct 2026 wherever the suite runs.
const NOW = new Date(2026, 9, 6, 15, 0)
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString()

const branch = (overrides: Partial<BranchProductionStatus>): BranchProductionStatus => ({
  branchId: 1,
  branchName: 'Sucúa',
  state: 'idle',
  since: null,
  lastEventAt: null,
  queuedCount: 0,
  cuttingOrderCodes: [],
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the live state’s line', () => {
  it('says since when a branch is cutting, and what', () => {
    const since = new Date(2026, 9, 6, 8, 12).toISOString()
    expect(
      statusDetail(branch({ state: 'cutting', since, cuttingOrderCodes: ['ORD-000131'] }), NOW),
    ).toBe('desde 08:12 · ORD-000131')
  })

  it('says how long a stopped branch has been quiet and what is waiting', () => {
    const at = minutesAgo(45)
    expect(
      statusDetail(
        branch({
          state: 'stopped',
          since: at,
          lastEventAt: at,
          queuedCount: 3,
          cuttingOrderCodes: ['ORD-000140'],
        }),
        NOW,
      ),
    ).toBe('hace 45 min · 3 en cola · 1 en corte')
  })

  it('says a branch that never cut has nothing registered', () => {
    expect(statusDetail(branch({ state: 'stopped', queuedCount: 1 }), NOW)).toBe(
      'sin cortes registrados · 1 en cola',
    )
    expect(statusDetail(branch({}), NOW)).toBe('sin cortes registrados')
  })

  it('gives an idle branch its last cut, by the hour today and by the day before', () => {
    const today = new Date(2026, 9, 6, 11, 5).toISOString()
    const before = new Date(2026, 9, 3, 16, 5).toISOString()
    expect(statusDetail(branch({ lastEventAt: today }), NOW)).toBe('último corte 11:05')
    expect(statusDetail(branch({ lastEventAt: before }), NOW)).toBe('último corte 03/10/2026')
  })
})
