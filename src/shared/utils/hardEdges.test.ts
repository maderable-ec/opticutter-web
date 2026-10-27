import { describe, expect, it } from 'vitest'
import { DEFAULT_CUT_RULES } from './cutRules'
import {
  cutHint,
  cutSize as cutSizeAt,
  isCutShort,
  placedCut,
  type SideBandTypes,
} from './hardEdges'

// Mirrors `tests/unit/test_hard_edges.py` in the API: same rule, same cases, at the default 1 mm
// unless a case says otherwise.

const MM = DEFAULT_CUT_RULES.hardEdgeCutMm
const cutSize = (height: number, width: number, types: SideBandTypes) =>
  cutSizeAt(height, width, types, MM)

describe('hard edge cut size', () => {
  it('takes one millimetre per hard side by default', () => {
    expect(MM).toBe(1)
  })

  it('takes the millimetres of the settings', () => {
    const three = { left: 'Hard', right: 'Hard', top: 'Hard' } as const
    expect(cutSizeAt(600, 400, three, 2)).toMatchObject({ height: 598, width: 396 })
    expect(cutSizeAt(600, 400, three, 0)).toMatchObject({ height: 600, width: 400 })
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
    expect(cutHint(400, 398, MM)).toBe(
      'Se corta a 398 mm: 400 − 2 mm por 2 cantos duros. Escribe siempre la medida final.',
    )
    expect(cutHint(600, 599, MM)).toContain('600 − 1 mm por 1 canto duro')
    // At 2 mm a side, 4 mm off is still two tapes.
    expect(cutHint(400, 396, 2)).toContain('400 − 4 mm por 2 cantos duros')
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
