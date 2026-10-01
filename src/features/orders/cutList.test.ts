import { describe, expect, it } from 'vitest'
import { groupByMaterial, isUnnamed, orderCutList, pieceEdges } from './cutList'
import type { OrderPiece } from './types'

const NAMES = new Map([
  [7, 'TAPACANTO BLANCO 19X0.45MM'],
  [9, 'TAPACANTO BARDOLINO 22X1.5MM'],
])

const piece = (over: Partial<OrderPiece> = {}): OrderPiece => ({
  materialKey: 'm1',
  productName: 'MELAMINA BLANCA 18MM',
  label: 'Lateral',
  height: 720,
  width: 560,
  quantity: 2,
  ...over,
})

describe('pieceEdges', () => {
  it('names the auto tape without the catalogue prefix', () => {
    const edges = pieceEdges({ sides: ['left', 'top'], product_id: 7, band_type: 'Soft' }, NAMES)
    expect(edges.canto).toEqual({ notation: '1L1C CS', tape: 'BLANCO 19X0.45MM' })
    expect(edges.specials).toEqual([])
    expect(edges.sides).toEqual({ top: true, bottom: false, left: true, right: false })
  })

  it('writes the auto part over the sides a special tape did not take', () => {
    const edges = pieceEdges(
      {
        sides: ['left', 'right', 'top'],
        product_id: 7,
        band_type: 'Soft',
        special_edges: [{ side: 'top', product_id: 9, band_type: 'Hard', alias: 'bdl' }],
      },
      NAMES,
    )
    expect(edges.canto).toEqual({ notation: '2L CS', tape: 'BLANCO 19X0.45MM' })
    expect(edges.specials).toEqual([{ notation: '1C CD BDL', tape: 'BARDOLINO 22X1.5MM' }])
    expect(edges.sides.top).toBe(true)
  })

  it('has no canto when a special tape took every side, and none at all when unbanded', () => {
    const all = pieceEdges(
      {
        sides: ['left'],
        product_id: 7,
        special_edges: [{ side: 'left', product_id: 9, alias: 'BDL' }],
      },
      NAMES,
    )
    expect(all.canto).toBeNull()
    expect(all.specials).toHaveLength(1)
    expect(pieceEdges(null)).toMatchObject({ canto: null, specials: [] })
  })

  it('leaves the tape unnamed when the order bills no line for it', () => {
    expect(pieceEdges({ sides: ['left'], product_id: 99 }, NAMES).canto?.tape).toBeNull()
  })
})

describe('orderCutList', () => {
  it('groups by material key in the order entered, counting units', () => {
    const groups = orderCutList([
      piece(),
      piece({ materialKey: 'm2', productName: 'MDF 15MM', label: 'Fondo', quantity: 1 }),
      piece({ label: 'Puerta', quantity: 3, hingingCode: 'B2' }),
    ])
    expect(groups.map((g) => [g.name, g.pieces.length, g.units])).toEqual([
      ['MELAMINA BLANCA 18MM', 2, 5],
      ['MDF 15MM', 1, 1],
    ])
    expect(groups[0]?.pieces[1]).toMatchObject({ label: 'Puerta', quantity: 3, codes: 'Abis B2' })
  })

  it('drops the rubric of an order that never got its material key', () => {
    const pieces = [piece({ materialKey: null }), piece({ materialKey: null })]
    expect(isUnnamed(groupByMaterial(pieces))).toBe(true)
    expect(orderCutList(pieces)[0]?.name).toBeNull()
  })
})
