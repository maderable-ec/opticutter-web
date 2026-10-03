import { describe, expect, it } from 'vitest'
import {
  additiveSpecialEdges,
  edgeWidthFitsBoard,
  emptyRequirement,
  notationFromSides,
  sidesFromNotation,
} from './optimizerForm'
import type { CantoNotation } from './optimizerForm'

describe('edgeWidthFitsBoard', () => {
  // Mirrors `products/service.edge_width_fits_board`: 1-10 mm of overhang.
  it('accepts a tape 1 to 10 mm wider than the board', () => {
    expect(edgeWidthFitsBoard(18, 19)).toBe(true)
    expect(edgeWidthFitsBoard(18, 28)).toBe(true)
  })

  it('refuses a tape that does not cover the edge or overhangs too much', () => {
    expect(edgeWidthFitsBoard(18, 18)).toBe(false)
    expect(edgeWidthFitsBoard(18, 29)).toBe(false)
  })

  it('accepts everything when the thickness or the width is unknown', () => {
    expect(edgeWidthFitsBoard(undefined, 45)).toBe(true)
    expect(edgeWidthFitsBoard(18, undefined)).toBe(true)
  })
})

describe('canto notation', () => {
  const ALL: CantoNotation[] = ['—', '1L', '2L', '1C', '2C', '1L1C', '1L2C', '2L1C', '4L']

  it('round-trips every notation through its sides', () => {
    for (const n of ALL) expect(notationFromSides(sidesFromNotation(n))).toBe(n)
  })

  it('puts 1L on left and 1C on top', () => {
    expect(sidesFromNotation('1L1C')).toEqual({
      left: true,
      right: false,
      top: true,
      bottom: false,
    })
  })

  it('reads an unknown notation as no banding', () => {
    expect(notationFromSides(sidesFromNotation('3L'))).toBe('—')
  })
})

describe('additiveSpecialEdges', () => {
  const piece = (canto: string, special: { side: 'left' | 'right' | 'top' | 'bottom' }[]) => ({
    ...emptyRequirement('m1'),
    edgeBanding: { productId: '7', sides: sidesFromNotation(canto), bandType: '' as const },
    specialEdges: special.map((e) => ({ ...e, productId: '9' })),
  })

  it('leaves a row with no shared side as it was, the same object', () => {
    const r = piece('2L1C', [{ side: 'bottom' }])
    expect(additiveSpecialEdges(r)).toBe(r)
  })

  // Saved when a special edge still replaced the Canto: the same tapes on the same sides.
  it('gives a shared side to the special edge and takes it off the Canto', () => {
    const next = additiveSpecialEdges(piece('2L1C', [{ side: 'left' }]))
    expect(notationFromSides(next.edgeBanding.sides)).toBe('1L1C')
    expect(next.edgeBanding.sides.left).toBe(false)
    expect(next.edgeBanding.productId).toBe('7')
    expect(next.specialEdges).toEqual([{ side: 'left', productId: '9' }])
  })
})
