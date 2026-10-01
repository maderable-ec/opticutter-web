import { describe, expect, it } from 'vitest'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import { requirementCutList } from './cutList'
import { emptyRequirement, sidesFromNotation } from './optimizerForm'
import type { MaterialForm, RequirementForm } from './optimizerForm'

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

const BY_ID = new Map([tape('1', 'BLN', 'Soft'), tape('2', 'CHM', 'Hard')].map((p) => [p.id, p]))

const BOARD = {
  id: '10',
  code: 'MEL-BL-18',
  name: 'MELAMINA BLANCA 18MM',
} as BoardProduct

const MATERIAL: MaterialForm = { uid: 'm1', boardId: '10', label: '', offcuts: [] }

const req = (over: Partial<RequirementForm> = {}): RequirementForm => ({
  ...emptyRequirement('m1'),
  height: 720,
  width: 560,
  quantity: 2,
  label: 'Lateral',
  ...over,
})

describe('requirementCutList', () => {
  it('reads a banded piece in the shop notation, naming its tape', () => {
    const [group] = requirementCutList(
      [
        req({
          edgeBanding: { productId: '1', sides: sidesFromNotation('2L1C'), bandType: '' },
          specialEdges: [{ side: 'top', productId: '2' }],
          groovingCode: 'R1',
        }),
      ],
      [MATERIAL],
      [BOARD],
      BY_ID,
    )
    expect(group?.name).toBe('MELAMINA BLANCA 18MM (MEL-BL-18)')
    expect(group?.pieces[0]).toMatchObject({
      label: 'Lateral',
      quantity: 2,
      canto: { notation: '2L CS', tape: 'BLN 19X0.45MM' },
      specials: [{ notation: '1C CD CHM', tape: 'CHM 19X0.45MM' }],
      codes: 'Ran R1',
      sides: { top: true, bottom: false, left: true, right: true },
    })
  })

  it('skips the blank scratch row and counts units per material', () => {
    const groups = requirementCutList(
      [req(), emptyRequirement('m1'), req({ label: 'Puerta', quantity: 3 })],
      [MATERIAL],
      [BOARD],
      BY_ID,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.pieces.map((p) => p.label)).toEqual(['Lateral', 'Puerta'])
    expect(groups[0]?.units).toBe(5)
  })

  it('says what is missing rather than inventing it', () => {
    const [group] = requirementCutList(
      [req({ width: '', quantity: '' })],
      [MATERIAL],
      [BOARD],
      BY_ID,
    )
    expect(group?.pieces[0]).toMatchObject({ width: '?', quantity: 0, canto: null })
  })
})
