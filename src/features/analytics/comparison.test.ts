import { describe, expect, it } from 'vitest'
import { leaderIndex } from './comparison'

describe('the comparison’s leader', () => {
  it('is the highest where more is better and the lowest where less is', () => {
    expect(leaderIndex([4210, 3180], 'higher')).toBe(0)
    expect(leaderIndex([31, 22.4], 'lower')).toBe(1)
  })

  it('is nobody on a tie, on an empty period or with a single branch', () => {
    expect(leaderIndex([5, 5], 'higher')).toBeNull()
    expect(leaderIndex([0, 0], 'higher')).toBeNull()
    expect(leaderIndex([12], 'higher')).toBeNull()
  })

  it('is nobody where neither direction is better', () => {
    expect(leaderIndex([504, 531], 'none')).toBeNull()
  })

  it('still names a branch with zero as the leader of a «fewer is better» row', () => {
    // No stopped hours at all is the best a branch can do.
    expect(leaderIndex([0, 2.5], 'lower')).toBe(0)
  })
})
