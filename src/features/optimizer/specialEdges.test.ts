import { describe, expect, it } from 'vitest'
import type { EdgeBandingProduct } from 'src/features/products/types'
import {
  addSpecialEdges,
  cantoFits,
  cantoLimit,
  freeSidesNotation,
  parseSpecialEdge,
  reresolveSpecialEdges,
  resolveSpecialEdge,
  seatSpecialEdges,
  specialEdgeTags,
} from './specialEdges'
import type { SpecialEdgePiece } from './specialEdges'
import { sidesFromNotation } from './optimizerForm'

const tape = (
  id: string,
  alias: string,
  bandType: 'Soft' | 'Hard',
  width: number,
): EdgeBandingProduct => ({
  id,
  code: `TC-${id}`,
  name: `TAPACANTO ${alias} ${width}X0.45MM`,
  price: 0.5,
  priceWithTax: 0.58,
  isActive: true,
  alias,
  type: 'edge_banding',
  attributes: { bandType, width, thickness: 0.45 },
})

// Widths out of order on purpose: the pick sorts them, the catalog does not.
const CATALOG = [
  tape('1', 'BLN', 'Soft', 22),
  tape('2', 'BLN', 'Soft', 19),
  tape('3', 'BLN', 'Soft', 45),
  tape('4', 'BLN', 'Hard', 19),
  tape('5', 'CHM', 'Soft', 19),
]
const BY_ID = new Map(CATALOG.map((p) => [p.id, p]))

type PieceSides = SpecialEdgePiece['autoSides']

// A 2L1C piece in canto suave on an 18 mm board.
const PIECE: SpecialEdgePiece = {
  thickness: 18,
  bandType: 'Soft',
  autoSides: ['left', 'right', 'top'],
}

describe('parseSpecialEdge', () => {
  it('reads sides, type and alias in any case', () => {
    expect(parseSpecialEdge('2L CS BLN')).toEqual({
      ok: true,
      value: { long: 2, short: 0, bandType: 'Soft', alias: 'BLN' },
    })
    expect(parseSpecialEdge('  1l1c   cd  chm ')).toEqual({
      ok: true,
      value: { long: 1, short: 1, bandType: 'Hard', alias: 'CHM' },
    })
  })

  it('reads 4L as the four sides', () => {
    expect(parseSpecialEdge('4L CS BLN')).toMatchObject({ ok: true, value: { long: 2, short: 2 } })
  })

  it('leaves the type out when the seller did', () => {
    const parsed = parseSpecialEdge('1L BLN')
    expect(parsed).toEqual({ ok: true, value: { long: 1, short: 0, alias: 'BLN' } })
  })

  it.each([
    ['3L CS BLN', 'no es una notación de lados'],
    ['2L CS', 'no dice el alias'],
    ['2L XX BLN', 'El tipo «XX» no existe'],
    ['BLN', 'no tiene el formato'],
    ['2L CS BLN extra', 'no tiene el formato'],
  ])('refuses «%s»', (entry, error) => {
    const parsed = parseSpecialEdge(entry)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toContain(error)
  })
})

describe('resolveSpecialEdge', () => {
  it('picks the narrowest width of the alias and type that covers the board', () => {
    const resolved = resolveSpecialEdge({ alias: 'BLN', bandType: 'Soft' }, CATALOG, 18)
    expect(resolved).toMatchObject({ ok: true, value: { id: '2' } })
    const thick = resolveSpecialEdge({ alias: 'BLN', bandType: 'Soft' }, CATALOG, 36)
    expect(thick).toMatchObject({ ok: true, value: { id: '3' } })
  })

  it('says why when nothing matches', () => {
    const unknown = resolveSpecialEdge({ alias: 'XYZ', bandType: 'Soft' }, CATALOG, 18)
    expect(unknown).toMatchObject({ ok: false })
    const wrongType = resolveSpecialEdge({ alias: 'CHM', bandType: 'Hard' }, CATALOG, 18)
    expect(wrongType).toMatchObject({ ok: false })
    const noWidth = resolveSpecialEdge({ alias: 'CHM', bandType: 'Soft' }, CATALOG, 36)
    expect(noWidth).toMatchObject({ ok: false })
  })
})

describe('addSpecialEdges', () => {
  it('adds to the Canto, on a side it leaves bare', () => {
    const { next, messages } = addSpecialEdges([], '1C CS BLN', CATALOG, PIECE)
    expect(next).toEqual([{ side: 'bottom', productId: '2' }])
    expect(messages[0]?.color).toBe('success')
    expect(messages[0]?.message).toContain('un lado corto sin canto')
  })

  it('bands all four sides of a 2L1C piece with 1C', () => {
    const { next } = addSpecialEdges([], '1C CS BLN', CATALOG, PIECE)
    const covered = new Set([...PIECE.autoSides, ...next.map((e) => e.side)])
    expect(covered.size).toBe(4)
  })

  // The case that used to re-colour a side of the Canto: now refused, with the Canto that makes room.
  it('refuses a side the Canto bands and says which Canto leaves room for it', () => {
    const twoLong = { ...PIECE, autoSides: ['left', 'right'] as PieceSides }
    const { next, messages, rejected } = addSpecialEdges([], '1L CS BLN', CATALOG, twoLong)
    expect(next).toEqual([])
    expect(rejected).toEqual(['1L CS BLN'])
    expect(messages[0]).toEqual({
      color: 'warning',
      message:
        '«1L CS BLN»: el Canto 2L ya cubre los dos lados largos. Un canto especial se suma al ' +
        'Canto, no lo reemplaza: cambia el Canto a 1L para agregarlo.',
    })
  })

  it('suggests lowering every kind the entry lacks, down to no Canto at all', () => {
    const four = { ...PIECE, autoSides: ['left', 'right', 'top', 'bottom'] as PieceSides }
    const both = addSpecialEdges([], '1L1C CS BLN', CATALOG, four)
    expect(both.messages[0]?.message).toContain('el Canto 4L ya cubre los cuatro lados')
    expect(both.messages[0]?.message).toContain('cambia el Canto a 1L1C')

    const oneLong = { ...PIECE, autoSides: ['left'] as PieceSides }
    const all = addSpecialEdges([], '2L CS BLN', CATALOG, oneLong)
    expect(all.messages[0]?.message).toContain('quita el Canto para agregarlo')
  })

  it('takes the piece type when the entry leaves it out', () => {
    const hard = { ...PIECE, bandType: 'Hard' as const }
    const { next, messages } = addSpecialEdges([], '1C BLN', CATALOG, hard)
    expect(next).toEqual([{ side: 'bottom', productId: '4' }])
    expect(messages[0]?.message).toContain('el de la pieza')
  })

  it('refuses an entry with no type on a piece with none', () => {
    const bare = { ...PIECE, bandType: '' as const }
    const { next, rejected } = addSpecialEdges([], '1C BLN', CATALOG, bare)
    expect(next).toEqual([])
    expect(rejected).toEqual(['1C BLN'])
  })

  it('takes several entries at once, one tape each', () => {
    const plain = { ...PIECE, autoSides: [] as PieceSides }
    const { next, rejected } = addSpecialEdges([], '1L CS BLN, 1L CS CHM', CATALOG, plain)
    expect(rejected).toEqual([])
    expect(next).toEqual([
      { side: 'left', productId: '2' },
      { side: 'right', productId: '5' },
    ])
  })

  it('never overwrites a side that already has a special edge', () => {
    const plain = { ...PIECE, autoSides: [] as PieceSides }
    const current = [
      { side: 'left' as const, productId: '2' },
      { side: 'right' as const, productId: '2' },
    ]
    const full = addSpecialEdges(current, '1L CS CHM', CATALOG, plain)
    expect(full.next).toEqual(current)
    expect(full.messages[0]?.message).toContain('ya no quedan lados largos libres')

    const half = addSpecialEdges(current.slice(0, 1), '2L CS CHM', CATALOG, plain)
    expect(half.messages[0]?.message).toContain('solo queda uno libre')
  })

  it('says both have to give when the Canto and a special edge hold the two sides', () => {
    const oneLong = { ...PIECE, autoSides: ['left'] as PieceSides }
    const current = [{ side: 'right' as const, productId: '5' }]
    const { messages } = addSpecialEdges(current, '2L CS BLN', CATALOG, oneLong)
    expect(messages[0]?.message).toContain('el Canto cubre uno y el otro tiene canto especial')
  })
})

describe('seatSpecialEdges', () => {
  it('keeps a special edge on a side the Canto leaves bare', () => {
    const edges = [{ side: 'right' as const, productId: '2' }]
    expect(seatSpecialEdges(sidesFromNotation('1L'), edges)).toEqual(edges)
  })

  it('moves a special edge off a side the Canto takes, to the other of its kind', () => {
    const edges = [
      { side: 'left' as const, productId: '2' },
      { side: 'top' as const, productId: '5' },
    ]
    expect(seatSpecialEdges(sidesFromNotation('1L1C'), edges)).toEqual([
      { side: 'right', productId: '2' },
      { side: 'bottom', productId: '5' },
    ])
  })

  it('refuses a Canto that leaves a kind too few sides', () => {
    const edges = [{ side: 'right' as const, productId: '2' }]
    expect(seatSpecialEdges(sidesFromNotation('2L'), edges)).toBeNull()
    expect(seatSpecialEdges(sidesFromNotation('2C'), edges)).not.toBeNull()
  })
})

describe('cantoFits / cantoLimit', () => {
  const oneLong = [{ side: 'left' as const, productId: '2' }]

  it('turns off every Canto that would band a side a special edge holds', () => {
    const off = ['—', '1L', '2L', '1C', '2C', '1L1C', '1L2C', '2L1C', '4L'].filter(
      (n) => !cantoFits(n, oneLong),
    )
    expect(off).toEqual(['2L', '2L1C', '4L'])
  })

  it('says what the special edges hold and the most the Canto can band', () => {
    expect(cantoLimit([])).toBeUndefined()
    expect(cantoLimit(oneLong)).toBe(
      'Los cantos especiales ocupan 1L: el Canto puede cubrir hasta 1L2C',
    )
    const all = (['left', 'right', 'top', 'bottom'] as const).map((side) => ({
      side,
      productId: '2',
    }))
    expect(cantoLimit(all)).toContain('la pieza no admite Canto')
  })
})

describe('freeSidesNotation', () => {
  it('counts the sides with neither the Canto nor a special edge', () => {
    expect(freeSidesNotation([], [])).toBe('4L')
    expect(freeSidesNotation(['left', 'right', 'top'], [])).toBe('1C')
    expect(freeSidesNotation(['left', 'right', 'top'], [{ side: 'bottom', productId: '2' }])).toBe(
      '',
    )
  })
})

describe('reresolveSpecialEdges', () => {
  it('moves each edge to the width that covers the new board, keeping design and type', () => {
    const edges = [{ side: 'left' as const, productId: '2' }]
    expect(reresolveSpecialEdges(edges, CATALOG, 36, BY_ID)).toEqual([
      { side: 'left', productId: '3' },
    ])
  })

  it('keeps an edge no stocked width can move', () => {
    const edges = [{ side: 'left' as const, productId: '5' }]
    expect(reresolveSpecialEdges(edges, CATALOG, 36, BY_ID)).toEqual(edges)
  })
})

describe('specialEdgeTags', () => {
  it('writes one tag per tape in the Canto notation', () => {
    const tags = specialEdgeTags(
      [
        { side: 'right', productId: '2' },
        { side: 'top', productId: '5' },
        { side: 'left', productId: '2' },
      ],
      BY_ID,
    )
    expect(tags.map((t) => t.label)).toEqual(['2L CS BLN', '1C CS CHM'])
  })
})
