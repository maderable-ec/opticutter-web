import { describe, expect, it } from 'vitest'
import { boardCutState, cutBarColor, cutPct, isCutDone } from './progress'

describe('cut progress', () => {
  it('rounds the share of pieces cut', () => {
    expect(cutPct({ cutPieces: 7, totalPieces: 18 })).toBe(39)
    expect(cutPct({ cutPieces: 18, totalPieces: 18 })).toBe(100)
  })

  it('reads an empty plan as nothing cut, never as done', () => {
    // No pieces is a plan that has not arrived, not a finished cut: a green bar there would lie.
    expect(cutPct({ cutPieces: 0, totalPieces: 0 })).toBe(0)
    expect(isCutDone({ cutPieces: 0, totalPieces: 0 })).toBe(false)
    expect(cutBarColor({ cutPieces: 0, totalPieces: 0 })).toBe('warning')
  })

  it('is amber while pieces are left and green once every one is cut', () => {
    expect(cutBarColor({ cutPieces: 7, totalPieces: 18 })).toBe('warning')
    expect(cutBarColor({ cutPieces: 18, totalPieces: 18 })).toBe('success')
  })
})

describe('boardCutState', () => {
  it('counts a board until it is done, then says so', () => {
    expect(boardCutState({ cutPieces: 0, totalPieces: 9 })).toMatchObject({
      tone: 'neutral',
      label: '0/9',
    })
    expect(boardCutState({ cutPieces: 3, totalPieces: 9 })).toMatchObject({
      tone: 'progress',
      label: '3/9',
    })
    expect(boardCutState({ cutPieces: 9, totalPieces: 9 })).toMatchObject({
      tone: 'success',
      label: 'Listo',
    })
  })

  it('draws every state with an icon, never with colour alone', () => {
    for (const cutPieces of [0, 3, 9]) {
      expect(boardCutState({ cutPieces, totalPieces: 9 }).icon).toBeDefined()
    }
  })
})
