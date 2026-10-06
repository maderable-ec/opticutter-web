import { describe, expect, it } from 'vitest'
import { pieceTextStack } from './cutDrawing'

// A 700×400 piece at the origin: roomy enough at rest for every line.
const piece = (notation: string | null, over: { width?: number; height?: number } = {}) => ({
  x: 0,
  y: 0,
  width: over.width ?? 400,
  height: over.height ?? 700,
  edges: notation ? { sides: [], notation } : null,
})

const texts = (stack: ReturnType<typeof pieceTextStack>) => stack.lines.map((l) => l.text)

describe('pieceTextStack', () => {
  it('stacks the count over its qualifier, then the codes', () => {
    const stack = pieceTextStack(piece('2L1C CS CSH'), { scale: 1, codes: 'B2 · R1' })
    expect(texts(stack)).toEqual(['2L1C', 'CS CSH', 'B2 · R1'])
    expect(stack.lines.map((l) => l.key)).toEqual(['note', 'band', 'codes'])
    expect({ cx: stack.cx, cy: stack.cy }).toEqual({ cx: 200, cy: 350 })
    // Top to bottom, centred on the piece.
    const ys = stack.lines.map((l) => l.y)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
  })

  it('gives every tape a line of its own', () => {
    const stack = pieceTextStack(piece('1L CS BLN · 1L CS CHM'), { scale: 1, codes: '' })
    expect(texts(stack)).toEqual(['1L CS BLN', '1L CS CHM'])
  })

  it('keeps only the counts where the qualifier does not fit yet', () => {
    // Past the canto's floor (60 mm) but under the measurements' (130×90).
    const small = piece('2L1C CS CSH · 1C CS BNL', { width: 80, height: 120 })
    expect(texts(pieceTextStack(small, { scale: 1, codes: 'B2' }))).toEqual(['2L1C', '1C', 'B2'])
  })

  it('reveals the codes on a piece with no banding', () => {
    expect(texts(pieceTextStack(piece(null), { scale: 1, codes: 'E7' }))).toEqual(['E7'])
  })

  it('is empty when hidden, or too small for anything', () => {
    expect(pieceTextStack(piece('2L', {}), { scale: 1, codes: 'B2', hidden: true }).lines).toEqual(
      [],
    )
    const tiny = piece('2L', { width: 50, height: 50 })
    expect(pieceTextStack(tiny, { scale: 1, codes: 'B2' }).lines).toEqual([])
    // ... until the zoom brings it past the floor.
    expect(texts(pieceTextStack(tiny, { scale: 2, codes: 'B2' }))).toEqual(['2L', 'B2'])
  })

  it('shrinks the whole stack to fit, never dropping a line', () => {
    // On screen a piece's height is its `width` (the board is drawn rotated): 70 mm of it.
    const narrow = piece('2L1C CS CSH · 1C CS BNL · 1L CS CHM', { width: 70, height: 2000 })
    const stack = pieceTextStack(narrow, { scale: 1, codes: 'B2 · R1' })
    expect(stack.lines).toHaveLength(4)
    const used = stack.lines.reduce((h, l) => h + l.size * 1.1, 0)
    expect(used).toBeLessThanOrEqual(70 * 0.85 + 1e-9)
  })
})
