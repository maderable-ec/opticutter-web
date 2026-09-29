import { describe, expect, it } from 'vitest'
import { edgeWidthFitsBoard, notationFromSides, sidesFromNotation } from './optimizerForm'
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
