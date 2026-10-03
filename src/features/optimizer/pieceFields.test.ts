import { describe, expect, it } from 'vitest'
import type { EdgeBandingProduct } from 'src/features/products/types'
import { emptyRequirement, sidesFromNotation } from './optimizerForm'
import type { EdgeBandingForm, RequirementForm } from './optimizerForm'
import {
  bandingLookup,
  cantoOptions,
  pieceReadout,
  tapacantoOptions,
  withBandTypeToggle,
  withBandingProduct,
  withCanto,
  withCantoNotation,
} from './pieceFields'

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

// The board's coordinated list (narrowest first, as the API sorts it) and the whole catalogue.
const COORD = [tape('1', 'BLN', 'Soft'), tape('2', 'BLN', 'Hard')]
const CATALOG = [...COORD, tape('3', 'CHM', 'Soft'), tape('4', 'CHM', 'Hard')]
const BY_ID = bandingLookup(COORD, CATALOG)

const banding = (over: Partial<EdgeBandingForm> = {}): EdgeBandingForm => ({
  productId: '',
  sides: sidesFromNotation('—'),
  bandType: '',
  ...over,
})

describe('tapacantoOptions', () => {
  it('offers the coordinated tapes of the type on screen, without the TAPACANTO prefix', () => {
    const options = tapacantoOptions(banding(), 'Hard', COORD, CATALOG, BY_ID)
    expect(options.map((o) => o.value)).toEqual(['', '2'])
    expect(options[1]).toEqual({ value: '2', label: 'BLN 19X0.45MM', sublabel: 'TC-2' })
  })

  it('falls back to the whole catalogue when the board coordinates none', () => {
    const options = tapacantoOptions(banding(), '', [], CATALOG, BY_ID)
    expect(options.map((o) => o.value)).toEqual(['', '1', '2', '3', '4'])
  })

  it('keeps a tape picked from the full catalogue in the list', () => {
    const options = tapacantoOptions(banding({ productId: '3' }), 'Soft', COORD, CATALOG, BY_ID)
    expect(options.map((o) => o.value)).toEqual(['', '1', '3'])
  })
})

describe('withCantoNotation', () => {
  it('gives a piece its first sides and the coordinated tape of its type', () => {
    const next = withCantoNotation(banding({ bandType: 'Hard' }), '2L1C', COORD)
    expect(next.sides).toEqual({ top: true, bottom: false, left: true, right: true })
    expect(next.productId).toBe('2')
  })

  it('never replaces a tape the piece already has', () => {
    expect(withCantoNotation(banding({ productId: '3' }), '4L', COORD).productId).toBe('3')
  })

  it('clears the sides and leaves the tape alone on «—»', () => {
    const next = withCantoNotation(
      banding({ productId: '1', sides: sidesFromNotation('2L') }),
      '—',
      COORD,
    )
    expect(Object.values(next.sides).some(Boolean)).toBe(false)
    expect(next.productId).toBe('1')
  })
})

describe('withBandTypeToggle', () => {
  it('switches the type and brings the coordinated tape for it', () => {
    expect(withBandTypeToggle(banding({ productId: '1' }), 'Hard', 'Soft', COORD)).toMatchObject({
      bandType: 'Hard',
      productId: '2',
    })
  })

  it('pressing the type on screen returns to unstated', () => {
    const next = withBandTypeToggle(
      banding({ productId: '1', bandType: 'Soft' }),
      'Soft',
      'Soft',
      COORD,
    )
    expect(next.bandType).toBe('')
  })

  it('keeps the current tape when the board coordinates none', () => {
    expect(withBandTypeToggle(banding({ productId: '3' }), 'Hard', '', []).productId).toBe('3')
  })
})

describe('withBandingProduct', () => {
  it('reads the type off the tape chosen', () => {
    expect(withBandingProduct(banding({ bandType: 'Soft' }), '4', BY_ID)).toMatchObject({
      productId: '4',
      bandType: 'Hard',
    })
  })

  it('keeps the type when the tape is cleared', () => {
    expect(
      withBandingProduct(banding({ productId: '1', bandType: 'Soft' }), '', BY_ID),
    ).toMatchObject({
      productId: '',
      bandType: 'Soft',
    })
  })
})

describe('pieceReadout', () => {
  const req = (over: Partial<RequirementForm> = {}): RequirementForm => ({
    ...emptyRequirement('m1'),
    ...over,
  })

  it('reads a banded piece in the shop notation, with the type off its tape', () => {
    const r = req({
      height: 720,
      width: 560,
      quantity: 2,
      label: ' Lateral ',
      edgeBanding: banding({ productId: '2', sides: sidesFromNotation('1L1C') }),
    })
    expect(pieceReadout(r, BY_ID)).toMatchObject({
      label: 'Lateral',
      dims: '720 × 560',
      quantity: 2,
      canto: '1L1C CD',
    })
  })

  it('says what is missing instead of inventing it', () => {
    const r = req({ height: 720, width: '', quantity: '' })
    expect(pieceReadout(r, BY_ID)).toMatchObject({ dims: '720 × ?', quantity: null, canto: null })
    expect(pieceReadout(req(), BY_ID).dims).toBe('')
  })

  it('leaves the type out when neither the piece nor its tape states one', () => {
    const r = req({ edgeBanding: banding({ sides: sidesFromNotation('2L') }) })
    expect(pieceReadout(r, BY_ID).canto).toBe('2L')
  })

  it('counts special edges per tape and prints the codes with their service', () => {
    const r = req({
      specialEdges: [
        { side: 'left', productId: '3' },
        { side: 'right', productId: '3' },
        { side: 'top', productId: '4' },
      ],
      hingingCode: 'B2',
      groovingCode: ' R1 ',
    })
    expect(pieceReadout(r, BY_ID)).toMatchObject({ specialTapes: 2, codes: 'Abis B2 · Ran R1' })
  })
})

describe('withCanto', () => {
  const withSpecial = (canto: string, side: 'left' | 'right'): RequirementForm => ({
    ...emptyRequirement('m1'),
    edgeBanding: banding({ sides: sidesFromNotation(canto) }),
    specialEdges: [{ side, productId: '3' }],
  })

  it('moves a special edge off the side the new Canto takes', () => {
    const next = withCanto(withSpecial('—', 'left'), '1L', COORD)
    expect(next?.edgeBanding.sides.left).toBe(true)
    expect(next?.specialEdges).toEqual([{ side: 'right', productId: '3' }])
  })

  it('refuses a Canto that would share a side with a special edge', () => {
    expect(withCanto(withSpecial('1L', 'right'), '2L', COORD)).toBeNull()
  })
})

describe('cantoOptions', () => {
  it('lists every Canto and turns off, with the reason, the ones a special edge blocks', () => {
    const r: RequirementForm = {
      ...emptyRequirement('m1'),
      specialEdges: [{ side: 'left', productId: '3' }],
    }
    const off = cantoOptions(r).filter((o) => o.disabled)
    expect(off.map((o) => o.value)).toEqual(['2L', '2L1C', '4L'])
    expect(off[0]?.label).toBe('2L — ocupado por canto especial')
    expect(cantoOptions(r, 'Sin canto')[0]).toEqual({
      value: '—',
      label: 'Sin canto',
      disabled: false,
    })
  })
})
