import { describe, expect, it } from 'vitest'
import { STATUS_TRANSITIONS, transitionsFor } from './status'

// The web half of `TRANSITION_ROLES`: who may move an order where.

const targets = (...args: Parameters<typeof transitionsFor>) =>
  transitionsFor(...args).map((t) => t.to)

describe('transitionsFor', () => {
  it('lets admin and seller queue or cancel a confirmed order', () => {
    expect(targets('confirmed', ['administrador'])).toEqual(['queued', 'cancelled'])
    expect(targets('confirmed', ['vendedor'])).toEqual(['queued', 'cancelled'])
  })

  it('keeps a paid (queued) order cancellable by admin only', () => {
    expect(targets('queued', ['administrador'])).toEqual(['cancelled'])
    expect(targets('queued', ['vendedor'])).toEqual([])
  })

  it('offers the rollback to the queue to admin only', () => {
    expect(targets('in_process', ['administrador'])).toEqual(['queued'])
    expect(targets('in_process', ['vendedor'])).toEqual([])
  })

  it('never offers the shop floor a status move', () => {
    for (const status of ['confirmed', 'queued', 'in_process', 'finished'] as const) {
      expect(targets(status, ['operador', 'canteador'])).toEqual([])
    }
  })

  it('offers nothing on a terminal order', () => {
    expect(targets('dispatched', ['administrador'])).toEqual([])
    expect(targets('cancelled', ['administrador'])).toEqual([])
  })
})

describe('STATUS_TRANSITIONS', () => {
  it('asks for a note on every cancellation and never makes it the primary button', () => {
    const cancellations = Object.values(STATUS_TRANSITIONS)
      .flat()
      .filter((t) => t.to === 'cancelled')
    expect(cancellations.length).toBeGreaterThan(0)
    for (const t of cancellations) {
      expect(t.requiresNote).toBe(true)
      expect(t.destructive).toBe(true)
    }
  })
})
