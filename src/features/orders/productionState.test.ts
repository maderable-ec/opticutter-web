import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { activityDetail, statusDetail } from './productionState'
import type { ActivityLiveStatus, BranchProductionStatus } from './types'

// Local time: 15:00 on 6 Oct 2026 wherever the suite runs.
const NOW = new Date(2026, 9, 6, 15, 0)
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString()

const track = (overrides: Partial<ActivityLiveStatus> = {}): ActivityLiveStatus => ({
  state: 'idle',
  since: null,
  orderCodes: [],
  waitingCount: 0,
  lastFinishedAt: null,
  ...overrides,
})

const branch = (overrides: Partial<BranchProductionStatus>): BranchProductionStatus => ({
  branchId: 1,
  branchName: 'Sucúa',
  state: 'idle',
  since: null,
  lastEventAt: null,
  queuedCount: 0,
  cuttingOrderCodes: [],
  banding: track(),
  additional: track(),
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

describe('the banding and additional work’s line', () => {
  it('says since when it is being worked, and on what', () => {
    const since = new Date(2026, 9, 6, 10, 20).toISOString()
    expect(
      activityDetail(
        'banding',
        track({ state: 'working', since, orderCodes: ['ORD-000131', 'ORD-000140'] }),
        NOW,
      ),
    ).toBe('desde 10:20 · ORD-000131, ORD-000140')
  })

  it('says how much is ready and since when the oldest waits', () => {
    expect(
      activityDetail(
        'banding',
        track({ state: 'waiting', since: minutesAgo(40), waitingCount: 2 }),
        NOW,
      ),
    ).toBe('2 órdenes listas · hace 40 min')
    expect(
      activityDetail(
        'additional',
        track({ state: 'waiting', since: minutesAgo(5), waitingCount: 1 }),
        NOW,
      ),
    ).toBe('1 orden lista · hace 5 min')
  })

  it('gives an idle track its last close, or says there is none', () => {
    const today = new Date(2026, 9, 6, 11, 5).toISOString()
    const before = new Date(2026, 9, 3, 16, 5).toISOString()
    expect(activityDetail('banding', track({ lastFinishedAt: today }), NOW)).toBe(
      'último canteado 11:05',
    )
    expect(activityDetail('additional', track({ lastFinishedAt: before }), NOW)).toBe(
      'último adicional 03/10/2026',
    )
    expect(activityDetail('banding', track(), NOW)).toBe('sin canteados registrados')
    expect(activityDetail('additional', track(), NOW)).toBe('sin adicionales registrados')
  })
})
