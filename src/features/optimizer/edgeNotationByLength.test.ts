import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EdgeBandingProduct } from 'src/features/products/types'
import { pieceEdges } from 'src/features/orders/cutList'
import type { OrderPieceEdges } from 'src/features/orders/types'
import { groupByTape, longSides, sidesNotation, widthIsLonger } from 'src/shared/utils/specialEdges'
import {
  EDGE_NOTATION_BY_LENGTH,
  emptyRequirement,
  notationFromSides,
  requirementsByLength,
  sidesFromNotation,
  withMeasure,
} from './optimizerForm'
import type { RequirementForm } from './optimizerForm'
import { bandingLookup, cantoOptions, pieceReadout, withCanto } from './pieceFields'
import { parsePieces, requirementsToCsv } from './piecesCsv'
import { rowsToRequirements } from './piecesImport'
import { addSpecialEdges, cantoLimit, freeSidesNotation, specialEdgeTags } from './specialEdges'
import { applyField } from './usePiecesEditor'
import { loadAutosave } from './optimizerStorage'

// `L` is the pair of sides along the piece's LONGER measure, the shop's reading: its files carry
// `90×1200 1L CS` for a strip banded along its 1200. The sides stay physical (`left`/`right` along
// the height), so on a piece whose width is the longer measure the letters swap pairs. Every piece
// whose height is the longer one reads as it always did — which is why every other test in the
// suite, all of them on such pieces, is unchanged.

const tape = (id: string, alias: string, bandType: 'Soft' | 'Hard'): EdgeBandingProduct => ({
  id,
  code: `TC-${id}`,
  name: `TAPACANTO ${alias} 19X0.45MM`,
  price: 0.5,
  priceWithTax: 0.58,
  isActive: true,
  alias,
  type: 'edge_banding',
  attributes: { bandType, width: 19, thickness: 0.45 },
})
const CATALOG = [tape('1', 'BLN', 'Soft'), tape('2', 'CHM', 'Hard')]
const BY_ID = bandingLookup(CATALOG, CATALOG)

const row = (
  height: number | string,
  width: number | string,
  canto = '—',
  special: RequirementForm['specialEdges'] = [],
): RequirementForm => ({
  ...emptyRequirement('m1'),
  height,
  width,
  edgeBanding: {
    productId: '1',
    sides: sidesFromNotation(canto, { height, width }),
    bandType: '',
  },
  specialEdges: special,
})

describe('the long sides', () => {
  it('are the pair along the longer measure', () => {
    expect(longSides({ height: 600, width: 300 })).toEqual(['left', 'right'])
    expect(longSides({ height: 300, width: 600 })).toEqual(['top', 'bottom'])
  })

  it('stay left/right on a square piece and on one with no measures yet', () => {
    expect(longSides({ height: 500, width: 500 })).toEqual(['left', 'right'])
    expect(longSides({ height: '', width: '600' })).toEqual(['left', 'right'])
    expect(longSides()).toEqual(['left', 'right'])
  })

  it('read the form strings as numbers', () => {
    expect(widthIsLonger({ height: '90', width: '1200' })).toBe(true)
    // As numbers, not as text: '90' sorts after '1200'.
    expect(widthIsLonger({ height: '1200', width: '90' })).toBe(false)
  })
})

describe('the notation on a wider piece', () => {
  const WIDE = { height: 300, width: 600 }

  it('puts 1L on top and 1C on left', () => {
    expect(sidesFromNotation('1L', WIDE)).toEqual({
      top: true,
      bottom: false,
      left: false,
      right: false,
    })
    expect(sidesFromNotation('1C', WIDE).left).toBe(true)
  })

  it('round-trips every notation through its sides', () => {
    for (const n of ['—', '1L', '2L', '1C', '2C', '1L1C', '1L2C', '2L1C', '4L']) {
      expect(notationFromSides(sidesFromNotation(n, WIDE), WIDE)).toBe(n)
    }
  })

  it('reads a strip typed 2L as banded along its length', () => {
    const strip = { height: 70, width: 2050 }
    expect(sidesFromNotation('2L', strip)).toMatchObject({ top: true, bottom: true })
    expect(sidesNotation(['top', 'bottom'], strip)).toBe('2L')
  })

  it('writes the special edges long sides first', () => {
    const edges = [
      { side: 'left' as const, tape: 'A' },
      { side: 'top' as const, tape: 'B' },
    ]
    expect(groupByTape(edges, (e) => e.tape).map((g) => g.tape)).toEqual(['A', 'B'])
    expect(groupByTape(edges, (e) => e.tape, WIDE).map((g) => g.tape)).toEqual(['B', 'A'])
  })
})

describe('editing a measure keeps the notation the seller typed', () => {
  it('moves the banding when the other measure becomes the longer one', () => {
    const r = row(600, 300, '2L1C', [{ side: 'bottom', productId: '2' }])
    const next = withMeasure(withMeasure(r, 'height', 200), 'width', 900)
    expect(notationFromSides(next.edgeBanding.sides, next)).toBe('2L1C')
    expect(next.edgeBanding.sides).toEqual(sidesFromNotation('2L1C', { height: 200, width: 900 }))
    // The special edge stays a short side: the other pair's.
    expect(next.specialEdges).toEqual([{ side: 'right', productId: '2' }])
  })

  it('leaves the banding where it is while the same measure stays longer', () => {
    const r = row(600, 300, '1L')
    expect(withMeasure(r, 'width', 400).edgeBanding.sides).toBe(r.edgeBanding.sides)
  })

  it('places a notation typed before the measures once they come', () => {
    // Typed with no measures: `1L` is `left`. Then 300 × 600 arrives, one digit at a time.
    let r = row('', '', '1L')
    for (const [field, value] of [
      ['height', '3'],
      ['height', '30'],
      ['height', '300'],
      ['width', '6'],
      ['width', '60'],
      ['width', '600'],
    ] as const) {
      r = withMeasure(r, field, value)
    }
    expect(r.edgeBanding.sides.top).toBe(true)
    expect(notationFromSides(r.edgeBanding.sides, r)).toBe('1L')
  })

  it('lands a Canto copied from a piece of the other shape on this piece`s long side', () => {
    const next = applyField(row(300, 600), row(600, 300, '1L'), 'edgeBandingSides')
    expect(next && notationFromSides(next.edgeBanding.sides, next)).toBe('1L')
    expect(next?.edgeBanding.sides.top).toBe(true)
  })

  it('fills a measure down with the same rule', () => {
    const next = applyField(row(600, 300, '1L'), row(100, 300), 'height')
    expect(next && notationFromSides(next.edgeBanding.sides, next)).toBe('1L')
    expect(next?.edgeBanding.sides.top).toBe(true)
  })
})

describe('the despiece controls', () => {
  it('sets the Canto on the long sides of the row', () => {
    const next = withCanto(row(300, 600), '2L', CATALOG)
    expect(next?.edgeBanding.sides).toMatchObject({ top: true, bottom: true, left: false })
    expect(next && pieceReadout(next, BY_ID, null).canto).toBe('2L CS')
  })

  it('offers the Canto that fits beside a special edge, counted by length', () => {
    // A special edge on `top`: a long side of a 300×600 piece.
    const r = row(300, 600, '—', [{ side: 'top', productId: '2' }])
    const off = cantoOptions(r)
      .filter((o) => o.disabled)
      .map((o) => o.value)
    expect(off).toEqual(['2L', '2L1C', '4L'])
    expect(cantoLimit(r.specialEdges, r)).toContain('ocupan 1L')
    expect(freeSidesNotation([], r.specialEdges, r)).toBe('1L2C')
  })

  it('takes a typed special edge onto a free side of the kind it names', () => {
    const r = row(300, 600, '1C')
    const { next, messages } = addSpecialEdges([], '1L CD CHM', CATALOG, {
      thickness: 18,
      bandType: 'Soft',
      autoSides: ['left'],
      measures: r,
    })
    expect(next).toEqual([{ side: 'top', productId: '2' }])
    expect(messages[0]?.message).toContain('Canto especial 1L (un lado largo sin canto)')
    expect(specialEdgeTags(next, BY_ID, r).map((t) => t.label)).toEqual(['1L CD CHM'])
  })
})

describe('import and export', () => {
  it('reads the shop`s 90×1200 1L CS as banded along the 1200', () => {
    const { rows } = parsePieces('MDF;90;1200;1;;1L CS;no')
    const [req] = rowsToRequirements(rows, 'm1')
    expect(req?.edgeBanding.sides).toMatchObject({ top: true, left: false })
  })

  it('exports a wider piece with the notation it reads', () => {
    const csv = requirementsToCsv([row(300, 600, '1L')], [], [])
    expect(csv).toContain('1L')
    expect(csv).not.toContain('1C')
  })
})

describe('saved form state from before the rule', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('moves a wider row to keep its notation, and marks nothing twice', () => {
    // Saved by the old reading: `1L` was `left`, on a 300×600 piece too.
    const legacy = {
      ...row(300, 600),
      edgeBanding: { ...row(300, 600).edgeBanding, sides: sidesFromNotation('1L') },
    }
    const tall = row(600, 300, '1L')
    const [moved, kept] = requirementsByLength([legacy, tall])
    expect(moved?.edgeBanding.sides.top).toBe(true)
    expect(moved && notationFromSides(moved.edgeBanding.sides, moved)).toBe('1L')
    expect(kept).toBe(tall)
    // Already marked: left alone.
    expect(requirementsByLength([legacy], EDGE_NOTATION_BY_LENGTH)[0]).toBe(legacy)
  })

  it('reads an autosave written before the mark the same way', () => {
    const legacy = {
      ...row(300, 600),
      edgeBanding: { ...row(300, 600).edgeBanding, sides: sidesFromNotation('1L') },
    }
    const store = new Map<string, string>([
      [
        'cutter:optimizer:autosave:v1',
        JSON.stringify({
          version: 1,
          savedAt: 0,
          draftId: null,
          draftName: '',
          materials: [],
          requirements: [legacy],
        }),
      ],
    ])
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null })
    const data = loadAutosave()
    expect(data?.edgeNotation).toBe(EDGE_NOTATION_BY_LENGTH)
    expect(data?.requirements[0]?.edgeBanding.sides.top).toBe(true)
  })
})

describe('an order', () => {
  const edges: OrderPieceEdges = { sides: ['top'], product_id: 1, band_type: 'Soft', alias: 'BLN' }

  it('reads L by length when it says so', () => {
    const { canto } = pieceEdges(edges, undefined, { height: 300, width: 600 })
    expect(canto?.notation).toBe('1L CS')
  })

  it('keeps the old reading when it was made before the rule', () => {
    expect(pieceEdges(edges).canto?.notation).toBe('1C CS')
  })
})
