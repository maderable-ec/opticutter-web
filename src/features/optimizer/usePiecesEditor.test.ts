import { describe, expect, it } from 'vitest'
import { emptyRequirement, sidesFromNotation } from './optimizerForm'
import type { RequirementForm } from './optimizerForm'
import { applyField, skippedFillMessage } from './usePiecesEditor'

const piece = (canto: string, special: ('left' | 'right' | 'top' | 'bottom')[] = []) =>
  ({
    ...emptyRequirement('m1'),
    edgeBanding: { productId: '7', sides: sidesFromNotation(canto), bandType: '' },
    specialEdges: special.map((side) => ({ side, productId: '9' })),
  }) satisfies RequirementForm

// A fill reaches each row through `applyField`: a row whose Canto and special edges would share a
// side refuses the value (null) and the fill leaves it as it was.
describe('applyField', () => {
  it('copies a Canto, re-seating the row special edges around it', () => {
    const next = applyField(piece('—', ['left']), piece('1L1C'), 'edgeBandingSides')
    expect(next?.edgeBanding.sides).toEqual(sidesFromNotation('1L1C'))
    expect(next?.specialEdges).toEqual([{ side: 'right', productId: '9' }])
  })

  it('refuses a Canto that leaves no side for a special edge of the row', () => {
    expect(applyField(piece('1L', ['right']), piece('4L'), 'edgeBandingSides')).toBeNull()
    expect(applyField(piece('1L', ['right']), piece('2L'), 'edgeBanding')).toBeNull()
  })

  it('copies special edges onto the sides the row Canto leaves bare', () => {
    const next = applyField(piece('1L'), piece('—', ['left']), 'specialEdges')
    expect(next?.specialEdges).toEqual([{ side: 'right', productId: '9' }])
    expect(applyField(piece('2L'), piece('—', ['left']), 'specialEdges')).toBeNull()
  })
})

describe('skippedFillMessage', () => {
  it('says nothing when every row took the value, and which column did not otherwise', () => {
    expect(skippedFillMessage('edgeBandingSides', 0)).toBeNull()
    expect(skippedFillMessage('edgeBandingSides', 2)).toContain('No se igualó el Canto en 2 piezas')
    expect(skippedFillMessage('specialEdges', 1)).toContain(
      'No se igualaron los cantos especiales en 1 pieza',
    )
  })
})
