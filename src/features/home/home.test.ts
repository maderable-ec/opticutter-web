import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LowStockItem } from 'src/features/dashboard/types'
import type { Order, OrderLine } from 'src/features/orders/types'
import {
  attentionRows,
  countExpiringSoon,
  listLink,
  productionRows,
  stockCounts,
  todayFigures,
} from './home'

// The home screen's counts. Each row opens a listing already filtered, and the filter in the link
// has to be the one the count was taken with: a «3» that opens a list of 40 is worse than no count.

const NOW = new Date(2026, 8, 29, 15, 0) // local time, 29 Sep 2026 15:00
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('listLink', () => {
  it('writes the listing’s own keys, repeating a multi-value one', () => {
    expect(listLink('/orders', { status: ['queued', 'in_process'], sort: 'stalest' })).toBe(
      '/orders?status=queued&status=in_process&sort=stalest',
    )
  })

  it('leaves out what is unset, and the question mark with it', () => {
    expect(listLink('/orders', { status: undefined, branchId: undefined })).toBe('/orders')
  })
})

describe('«Requiere atención»', () => {
  it('links each pile to its listing, filtered by the branch on screen', () => {
    const rows = attentionRows(2)
    expect(rows.changesRequested.to).toBe('/preorders?status=changes_requested&branchId=2')
    expect(rows.expiringSoon.to).toBe(
      '/preorders?status=draft&status=sent&status=changes_requested&sort=oldest&branchId=2',
    )
    expect(rows.toQueue.to).toBe('/orders?status=confirmed&branchId=2')
    expect(rows.toDispatch.to).toBe('/orders?status=finished&branchId=2')
  })

  it('drops the branch when the admin looks at all of them', () => {
    expect(attentionRows().toQueue.to).toBe('/orders?status=confirmed')
  })

  it('draws each pile with the icon of the status it counts', () => {
    const rows = attentionRows()
    for (const row of Object.values(rows)) expect(row.icon, row.label).toBeDefined()
    expect(rows.changesRequested.tone).toBe('progress')
  })

  it('counts as expiring only open quotes that lapse within three days', () => {
    const quote = (days: number, status: 'draft' | 'sent' | 'confirmed' | 'expired' = 'sent') => ({
      expiresAt: new Date(NOW.getTime() + days * DAY).toISOString(),
      status,
    })
    expect(
      countExpiringSoon([
        quote(1),
        quote(2.9, 'draft'),
        quote(4), // not yet
        quote(-1), // already past: the list marks it expired
        quote(1, 'confirmed'), // closed: nothing left to lose
        { expiresAt: null, status: 'sent' },
      ]),
    ).toBe(2)
  })
})

describe('Producción', () => {
  it('links the queue and the work in progress to their listings', () => {
    const rows = productionRows(1)
    expect(rows.queued.to).toBe('/orders?status=queued&branchId=1')
    expect(rows.inProcess.to).toBe('/orders?status=in_process&branchId=1')
  })
})

describe('todayFigures', () => {
  const line = (overrides: Partial<OrderLine>): OrderLine => ({
    id: '1',
    productCode: 'X',
    productName: 'X',
    quantity: 1,
    unitPriceSnapshot: 1,
    lineTotal: 1,
    ...overrides,
  })
  const order = (
    createdAt: Date,
    total: number,
    lines: OrderLine[] = [],
    status: Order['status'] = 'confirmed',
  ) => ({ createdAt: createdAt.toISOString(), total, lines, status })

  it('adds up the orders born today, local time, and none cancelled', () => {
    const morning = new Date(2026, 8, 29, 8, 30)
    const lastNight = new Date(2026, 8, 28, 23, 45)
    expect(
      todayFigures([
        order(morning, 100, [line({ quantity: 3 }), line({ quantity: 11, linearM: 11 })]),
        order(morning, 50, [line({ quantity: 1, halfBoard: true })], 'queued'),
        order(morning, 70, [line({ quantity: 2 })], 'cancelled'),
        order(lastNight, 999, [line({ quantity: 9 })]),
      ]),
    ).toEqual({ orders: 2, sold: 150, boards: 3.5 })
  })
})

describe('stockCounts', () => {
  const item = (branchId: number, available: number) =>
    ({ branch: { id: branchId, code: 'B', name: 'B' }, available }) as LowStockItem

  it('splits the branch’s low stock from what ran out', () => {
    const items = [item(1, 2), item(1, 0), item(1, -1), item(2, 1)]
    expect(stockCounts(items, 1)).toEqual({ low: 1, out: 2 })
    expect(stockCounts(items)).toEqual({ low: 2, out: 2 })
  })
})
