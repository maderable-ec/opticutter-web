import { describe, expect, it } from 'vitest'

import { workHours, workSpan } from './banderOrders'
import type { BanderOrder } from './types'

const work = (overrides: Partial<BanderOrder> = {}): BanderOrder => ({
  orderId: 70,
  orderCode: 'ORD-000070',
  clientName: 'Carpintería Andes',
  branchName: 'Sucúa',
  kind: 'banding',
  startedAt: new Date(2026, 9, 6, 9, 0).toISOString(),
  finishedAt: new Date(2026, 9, 6, 11, 0).toISOString(),
  day: '2026-10-06',
  hours: 2,
  bandedLinearM: 27.23,
  ...overrides,
})

describe('a bander’s work', () => {
  it('gives the hours and the span of a clocked one', () => {
    expect(workHours(work())).toBe('2,0 h')
    expect(workSpan(work())).toBe('09:00 – 11:00')
  })

  it('says one registered after the work has no time', () => {
    const tapped = work({ hours: null, finishedAt: new Date(2026, 9, 6, 16, 0).toISOString() })
    expect(workHours(tapped)).toBe('—')
    expect(workSpan(tapped)).toBe('registrada al cerrar, 16:00')
  })
})
