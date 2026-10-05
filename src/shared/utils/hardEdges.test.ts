import { describe, expect, it } from 'vitest'
import { cutHint, cutSize, HARD_EDGE_CUT_MM, isCutShort, placedCut } from './hardEdges'

// Mirrors `tests/unit/test_hard_edges.py` in the API: same rule, same cases.

describe('hard edge cut size', () => {
  it('takes one millimetre per hard side', () => {
    expect(HARD_EDGE_CUT_MM).toBe(1)
  })

  it('shortens the width for a long side and the height for a short one', () => {
    expect(cutSize(600, 400, { left: 'Hard' })).toEqual({
      height: 600,
      width: 399,
      heightOff: 0,
      widthOff: 1,
    })
    expect(cutSize(600, 400, { left: 'Hard', right: 'Hard' }).width).toBe(398)
    expect(cutSize(600, 400, { top: 'Hard' }).height).toBe(599)
    const all = cutSize(600, 400, { top: 'Hard', bottom: 'Hard', left: 'Hard', right: 'Hard' })
    expect([all.height, all.width]).toEqual([598, 398])
  })

  it('takes nothing off for a soft or unknown tape', () => {
    expect(cutSize(600, 400, { left: 'Soft', top: undefined, right: null })).toEqual({
      height: 600,
      width: 400,
      heightOff: 0,
      widthOff: 0,
    })
  })

  it('keeps the size of a piece too small for its discount', () => {
    expect(cutSize(2, 1, { top: 'Hard', bottom: 'Hard', left: 'Hard' })).toMatchObject({
      height: 2,
      width: 1,
    })
  })

  it('explains the cut in words', () => {
    expect(cutHint(400, 398)).toBe(
      'Se corta a 398 mm: 400 − 2 mm por 2 cantos duros. Escribe siempre la medida final.',
    )
    expect(cutHint(600, 599)).toContain('600 − 1 mm por 1 canto duro')
  })

  it('reads a placed piece in its own frame, rotated or not', () => {
    const ordered = { originalHeight: 600, originalWidth: 400 }
    const straight = placedCut({ ...ordered, height: 600, width: 398, rotated: false })
    expect(straight).toEqual({ height: 600, width: 398, heightOff: 0, widthOff: 2 })
    const turned = placedCut({ ...ordered, height: 398, width: 600, rotated: true })
    expect(turned).toEqual(straight)
    expect(isCutShort(turned)).toBe(true)
    expect(isCutShort(placedCut({ ...ordered, height: 400, width: 600, rotated: true }))).toBe(
      false,
    )
  })
})
