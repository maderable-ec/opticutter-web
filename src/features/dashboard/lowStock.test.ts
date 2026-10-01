import { describe, expect, it } from 'vitest'
import { filterLowStock, type LowStockFilterValues } from './lowStock'
import type { LowStockItem } from './types'

const item = (overrides: Partial<LowStockItem>): LowStockItem => ({
  productId: 1,
  code: 'MEL-BL-18',
  name: 'MELAMINA BLANCA 18MM',
  type: 'board',
  subtype: 'MDP',
  unit: 'sheets',
  branch: { id: 1, code: 'MTZ', name: 'Matriz' },
  available: 3,
  threshold: 5,
  ...overrides,
})

const REPORT = [
  item({}),
  item({ productId: 2, code: 'MEL-NG-15', name: 'NOGAL TERRA', subtype: 'MDF' }),
  item({
    productId: 3,
    code: 'TC-BL-19',
    name: 'TAPACANTO BLANCO',
    type: 'edge_banding',
    subtype: null,
    unit: 'linear_m',
    branch: { id: 2, code: 'NTE', name: 'Norte' },
  }),
]

const NONE: LowStockFilterValues = { branch: [], type: [], subtype: [] }
const codes = (values: LowStockFilterValues, search = '') =>
  filterLowStock(REPORT, values, search).map((i) => i.code)

describe('filterLowStock', () => {
  it('keeps everything with no filter and no search', () => {
    expect(codes(NONE)).toHaveLength(3)
  })

  it('narrows by branch, type and subtype, each one a union and all of them together', () => {
    expect(codes({ ...NONE, branch: ['2'] })).toEqual(['TC-BL-19'])
    expect(codes({ ...NONE, type: ['board'] })).toEqual(['MEL-BL-18', 'MEL-NG-15'])
    expect(codes({ ...NONE, subtype: ['MDP', 'MDF'] })).toEqual(['MEL-BL-18', 'MEL-NG-15'])
    expect(codes({ branch: ['1'], type: ['board'], subtype: ['MDF'] })).toEqual(['MEL-NG-15'])
  })

  it('never lets a product with no subtype through a subtype filter', () => {
    expect(codes({ ...NONE, type: ['edge_banding'], subtype: ['MDP'] })).toEqual([])
  })

  it('searches the code and the name, ignoring case and the edges of the term', () => {
    expect(codes(NONE, '  nogal ')).toEqual(['MEL-NG-15'])
    expect(codes(NONE, 'tc-bl')).toEqual(['TC-BL-19'])
    expect(codes(NONE, 'Matriz')).toEqual([])
  })
})
