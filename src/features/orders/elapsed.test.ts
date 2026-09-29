import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activityClock, elapsedTone, statusClock } from './elapsed'

const CREATED = '2026-09-29T08:00:00Z'
const QUEUED = '2026-09-29T09:00:00Z'
const CHANGED = '2026-09-29T11:00:00Z'

describe('statusClock', () => {
  it('measures a queued order from when it reached the shop, not from the last change', () => {
    // An admin rollback `in_process → queued` moves `statusChangedAt`; the wait did not restart.
    expect(
      statusClock({
        status: 'queued',
        queuedAt: QUEUED,
        statusChangedAt: CHANGED,
        createdAt: CREATED,
      }),
    ).toBe(QUEUED)
  })

  it('falls back for a queued order without queuedAt', () => {
    expect(statusClock({ status: 'queued', statusChangedAt: CHANGED, createdAt: CREATED })).toBe(
      CHANGED,
    )
  })

  it('measures any other open status from its last change', () => {
    expect(
      statusClock({
        status: 'in_process',
        queuedAt: QUEUED,
        statusChangedAt: CHANGED,
        createdAt: CREATED,
      }),
    ).toBe(CHANGED)
  })

  it('stays silent on the statuses nothing will move', () => {
    for (const status of ['finished', 'dispatched', 'cancelled'] as const) {
      expect(statusClock({ status, statusChangedAt: CHANGED, createdAt: CREATED })).toBeNull()
    }
  })
})

describe('activityClock', () => {
  it('runs a pending activity from readyAt, never before its floor opens', () => {
    expect(activityClock({ type: 'banding', status: 'pending', readyAt: QUEUED })).toBe(QUEUED)
    expect(activityClock({ type: 'banding', status: 'pending', readyAt: null })).toBeNull()
  })

  it('runs an activity in progress from when it started', () => {
    expect(
      activityClock({
        type: 'cutting',
        status: 'in_progress',
        readyAt: QUEUED,
        startedAt: CHANGED,
      }),
    ).toBe(CHANGED)
  })

  it('stops once the activity is done', () => {
    expect(activityClock({ type: 'cutting', status: 'done', startedAt: CHANGED })).toBeNull()
  })
})

describe('elapsedTone', () => {
  const NOW = new Date('2026-09-29T12:00:00Z')
  const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('turns amber at an hour and red at four', () => {
    expect(elapsedTone(ago(59))).toBe('muted')
    expect(elapsedTone(ago(60))).toBe('warning')
    expect(elapsedTone(ago(239))).toBe('warning')
    expect(elapsedTone(ago(240))).toBe('danger')
  })
})
