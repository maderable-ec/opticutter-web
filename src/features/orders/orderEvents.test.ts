import { describe, expect, it } from 'vitest'
import { eventFilterParams, orderEvent, readEventFilter } from './orderEvents'
import type { Order, OrderActivity, OrderHistoryEntry, OrderStatus } from './types'

// Ecuador is UTC-5 and the tests run in the machine's zone; every instant here sits mid-day, far
// from either midnight, so the local day is the same in any zone the suite runs in.
const move = (
  fromStatus: OrderStatus | undefined,
  toStatus: OrderStatus,
  createdAt: string,
  actorLabel: string,
): OrderHistoryEntry => ({ id: createdAt, fromStatus, toStatus, createdAt, actorLabel })

const activity = (overrides: Partial<OrderActivity>): OrderActivity => ({
  type: 'cutting',
  status: 'done',
  ...overrides,
})

const order = (overrides: Partial<Order> = {}) => ({
  createdAt: '2026-06-01T15:00:00Z',
  createdByName: 'Sara',
  queuedAt: '2026-06-02T14:00:00Z',
  dispatchedAt: '2026-06-06T16:00:00Z',
  dispatchedByLabel: 'Sara',
  history: [
    move(undefined, 'confirmed', '2026-06-01T15:00:00Z', 'Cliente'),
    move('confirmed', 'queued', '2026-06-02T14:00:00Z', 'Carla'),
    move('queued', 'in_process', '2026-06-03T13:00:00Z', 'Oscar'),
    move('in_process', 'queued', '2026-06-08T14:00:00Z', 'Carla'),
    move('queued', 'in_process', '2026-06-09T14:00:00Z', 'Oscar'),
    move('in_process', 'finished', '2026-06-10T21:00:00Z', 'Bruno'),
    // Marking it as priority: a row that moves nothing.
    move('finished', 'finished', '2026-06-11T14:00:00Z', 'Carla'),
  ],
  activities: [
    activity({ finishedAt: '2026-06-10T15:00:00Z', finishedByLabel: 'Oscar' }),
    activity({ type: 'banding', finishedAt: '2026-06-10T21:00:00Z', finishedByLabel: 'Bruno' }),
  ],
  ...overrides,
})

describe('orderEvent', () => {
  it('reads each event where it is written, with whoever did it', () => {
    const o = order()
    expect(orderEvent(o, 'created')).toEqual({ at: '2026-06-01T15:00:00Z', by: 'Sara' })
    expect(orderEvent(o, 'paid')).toEqual({ at: '2026-06-02T14:00:00Z', by: 'Carla' })
    expect(orderEvent(o, 'cut_done')).toEqual({ at: '2026-06-10T15:00:00Z', by: 'Oscar' })
    expect(orderEvent(o, 'banding_done')).toEqual({ at: '2026-06-10T21:00:00Z', by: 'Bruno' })
    expect(orderEvent(o, 'dispatched')).toEqual({ at: '2026-06-06T16:00:00Z', by: 'Sara' })
  })

  it('is null for what has not happened', () => {
    const o = order()
    expect(orderEvent(o, 'additional_done')).toBeNull()
    expect(orderEvent(o, 'cancelled')).toBeNull()
    expect(orderEvent(order({ queuedAt: null }), 'paid')).toBeNull()
    expect(orderEvent(order({ dispatchedAt: undefined }), 'dispatched')).toBeNull()
  })

  it('ignores a row that moved nothing', () => {
    // The priority mark on the 11th is the latest `finished` row, and still not the finishing.
    expect(orderEvent(order(), 'finished')).toEqual({ at: '2026-06-10T21:00:00Z', by: 'Bruno' })
  })

  it('shows the entry the filter found when the order entered twice', () => {
    expect(orderEvent(order(), 'in_process', { from: '2026-06-03', to: '2026-06-03' })).toEqual({
      at: '2026-06-03T13:00:00Z',
      by: 'Oscar',
    })
    // Without a range, the latest.
    expect(orderEvent(order(), 'in_process')?.at).toBe('2026-06-09T14:00:00Z')
  })

  it('reads a legacy entry to the shop as entering it', () => {
    const legacy = order({ history: [move('queued', 'cutting', '2026-06-03T13:00:00Z', 'Oscar')] })
    expect(orderEvent(legacy, 'in_process')).toEqual({ at: '2026-06-03T13:00:00Z', by: 'Oscar' })
  })

  it('names the payment by its confirmed → queued row, never the rollback', () => {
    const o = order({
      history: [
        move('in_process', 'queued', '2026-06-08T14:00:00Z', 'Admin'),
        move('confirmed', 'queued', '2026-06-02T14:00:00Z', 'Carla'),
      ],
    })
    expect(orderEvent(o, 'paid')?.by).toBe('Carla')
  })

  it('has no name for a seller who is gone', () => {
    expect(orderEvent(order({ createdByName: null }), 'created')?.by).toBeNull()
  })
})

describe('readEventFilter', () => {
  const reader = (params: Record<string, string>) => (key: string) => params[key] ?? ''

  it('reads the event filter off the URL', () => {
    expect(
      readEventFilter(
        reader({
          dateField: 'finished',
          dateFrom: '2026-06-01',
          dateTo: '2026-06-07',
          actorId: '7',
        }),
      ),
    ).toEqual({ dateField: 'finished', dateFrom: '2026-06-01', dateTo: '2026-06-07', actorId: '7' })
  })

  it('defaults to created, also for an event it does not know', () => {
    expect(readEventFilter(reader({})).dateField).toBe('created')
    expect(readEventFilter(reader({ dateField: 'cutting' })).dateField).toBe('created')
  })

  it('reads an old created range as one', () => {
    expect(readEventFilter(reader({ createdFrom: '2026-06-01', createdTo: '2026-06-02' }))).toEqual(
      {
        dateField: 'created',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-02',
        actorId: '',
      },
    )
  })

  it('never reads an old range as another event', () => {
    const values = readEventFilter(reader({ dateField: 'finished', createdFrom: '2026-06-01' }))
    expect(values.dateFrom).toBe('')
  })
})

describe('eventFilterParams', () => {
  it('sends the event only with something for it to read', () => {
    const none = { dateField: 'finished' as const, dateFrom: '', dateTo: '', actorId: '' }
    expect(eventFilterParams(none)).toEqual({
      dateField: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      actorId: undefined,
    })
    expect(eventFilterParams({ ...none, actorId: '7' })).toEqual({
      dateField: 'finished',
      dateFrom: undefined,
      dateTo: undefined,
      actorId: 7,
    })
    expect(eventFilterParams({ ...none, dateTo: '2026-06-07' }).dateField).toBe('finished')
  })
})
