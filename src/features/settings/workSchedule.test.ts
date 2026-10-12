import { describe, expect, it } from 'vitest'

import {
  dayError,
  nextWindow,
  sameSchedule,
  scheduleErrors,
  weeklyHours,
  type WorkSchedule,
} from './workSchedule'

const weekday = [
  { start: '08:00', end: '13:00' },
  { start: '14:00', end: '18:00' },
]

const shop = (): WorkSchedule => ({
  mon: weekday,
  tue: weekday,
  wed: weekday,
  thu: weekday,
  fri: weekday,
  sat: [{ start: '08:00', end: '13:00' }],
  sun: [],
})

describe('the working hours', () => {
  it('add up to the week the shop works', () => {
    // Five days of nine hours and a Saturday morning.
    expect(weeklyHours(shop())).toBe(50)
    expect(weeklyHours({ ...shop(), sat: [] })).toBe(45)
  })

  it('accept the shop’s own schedule, a closed day included', () => {
    expect(scheduleErrors(shop())).toEqual({})
    expect(dayError([])).toBeUndefined()
  })

  it('reject a stretch that ends before it starts, or does not start', () => {
    expect(dayError([{ start: '13:00', end: '08:00' }])).toMatch(/terminar después/)
    expect(dayError([{ start: '08:00', end: '08:00' }])).toMatch(/terminar después/)
    expect(dayError([{ start: '', end: '13:00' }])).toMatch(/Completa/)
  })

  it('reject two stretches of a day that overlap, in whatever order they were typed', () => {
    const overlapping = [
      { start: '12:00', end: '18:00' },
      { start: '08:00', end: '13:00' },
    ]
    expect(dayError(overlapping)).toMatch(/solaparse/)
    // Back to back is fine: the lunch hour may be no hour at all.
    expect(
      dayError([
        { start: '08:00', end: '13:00' },
        { start: '13:00', end: '18:00' },
      ]),
    ).toBeUndefined()
  })

  it('name the day that is wrong and only that one', () => {
    const errors = scheduleErrors({ ...shop(), wed: [{ start: '09:00', end: '07:00' }] })
    expect(Object.keys(errors)).toEqual(['wed'])
  })

  it('tell an edited schedule from the saved one', () => {
    expect(sameSchedule(shop(), shop())).toBe(true)
    expect(sameSchedule(shop(), { ...shop(), sat: [] })).toBe(false)
    expect(sameSchedule(shop(), { ...shop(), sat: [{ start: '08:00', end: '12:00' }] })).toBe(false)
  })

  it('start a day’s next stretch where the last one ended', () => {
    expect(nextWindow([])).toEqual({ start: '08:00', end: '13:00' })
    expect(nextWindow([{ start: '08:00', end: '13:00' }])).toEqual({ start: '13:00', end: '13:00' })
  })
})
