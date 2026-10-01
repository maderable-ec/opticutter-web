import { describe, expect, it } from 'vitest'
import { fmtFileSize, fmtM2, fmtMeters, fmtMoney, fmtNumber, fmtPercent } from './format'

// The unit is joined with a no-break space, so a figure never parts from it at a line end.
const NBSP = ' '

describe('figures in es-EC', () => {
  it('writes the decimal comma the money already uses', () => {
    expect(fmtMoney(1284.4)).toBe('$1.284,40')
    expect(fmtNumber(5.246, 3)).toBe('5,246')
    expect(fmtM2(5.246, 3)).toBe(`5,246${NBSP}m²`)
    expect(fmtMeters(11)).toBe(`11,00${NBSP}m`)
    expect(fmtPercent(65)).toBe(`65,0${NBSP}%`)
  })

  it('keeps the precision each call asks for', () => {
    expect(fmtPercent(81.25, 0)).toBe(`81${NBSP}%`)
    expect(fmtMeters(24.46, 1)).toBe(`24,5${NBSP}m`)
    expect(fmtM2(3.41)).toBe(`3,41${NBSP}m²`)
  })

  it('drops trailing zeros only when asked', () => {
    expect(fmtNumber(3.4, 2, 0)).toBe('3,4')
    expect(fmtNumber(3, 2, 0)).toBe('3')
    expect(fmtM2(3.4, 2, 0)).toBe(`3,4${NBSP}m²`)
    expect(fmtNumber(7.5, 1, 0)).toBe('7,5')
  })

  // The reason a measure in mm must never go through here: the shop reads «2440», not «2.440».
  it('groups thousands from four digits', () => {
    expect(fmtNumber(2440)).toBe('2.440')
  })

  it('renders a missing figure as an em dash', () => {
    expect(fmtNumber(null)).toBe('—')
    expect(fmtPercent(undefined)).toBe('—')
    expect(fmtMeters(null)).toBe('—')
    expect(fmtM2(null)).toBe('—')
  })

  it('sizes an upload in B, whole KB, then MB with one decimal', () => {
    expect(fmtFileSize(512)).toBe(`512${NBSP}B`)
    expect(fmtFileSize(2048)).toBe(`2${NBSP}KB`)
    expect(fmtFileSize(3_250_000)).toBe(`3,1${NBSP}MB`)
  })
})
