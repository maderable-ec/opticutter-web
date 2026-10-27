import { describe, expect, it, vi } from 'vitest'
import type { EdgeBandingProduct } from 'src/features/products/types'
import { DEFAULT_CUT_RULES } from 'src/shared/utils/cutRules'
import { buildPayload, emptyMaterial, emptyRequirement, sidesFromNotation } from './optimizerForm'
import type { RequirementForm } from './optimizerForm'
import {
  anyAssembly,
  assemblyRowCuts,
  assemblyRowIssues,
  layerTwin,
  spreadAssemblyMark,
  withAssemblyCode,
} from './assemblyRows'
import { bandingLookup } from './pieceFields'
import { applyField } from './usePiecesEditor'
import { signatureOf } from './useOptimizerWizard'

// `useOptimizerWizard` reports steps through analytics, which reads the session from localStorage on
// import; the staleness signature needs neither.
vi.mock('src/shared/analytics', () => ({ track: () => undefined }))

const HARD: EdgeBandingProduct = {
  id: '2',
  code: 'TC-2',
  name: 'TAPACANTO BLN 22X1MM',
  price: 0.5,
  priceWithTax: 0.58,
  isActive: true,
  alias: 'BLN',
  type: 'edge_banding',
  attributes: { bandType: 'Hard', width: 22, thickness: 1 },
}
const BY_ID = bandingLookup([], [HARD])

const row = (over: Partial<RequirementForm> = {}): RequirementForm => ({
  ...emptyRequirement('m1'),
  height: 600,
  width: 400,
  quantity: 3,
  label: 'Tapa',
  ...over,
})

const banded = (code: string, material = 'm1') =>
  withAssemblyCode(
    row({
      materialUid: material,
      edgeBanding: { productId: '2', sides: sidesFromNotation('2L'), bandType: 'Hard' },
    }),
    code,
  )

describe('assembly rows', () => {
  it('cuts the bare twin like the banded layer, across materials', () => {
    const first = banded('E1', 'm1')
    const rows = [first, { ...layerTwin(first, 'E1'), materialUid: 'm2' }]
    expect(
      assemblyRowCuts(rows, BY_ID, DEFAULT_CUT_RULES).map((c) => c && [c.height, c.width]),
    ).toEqual([
      [605, 403],
      [605, 403],
    ])
    // By the settings' millimetres: 3 large, 2 short per hard side.
    const other = { hardEdgeCutMm: 2, assemblyAllowanceMm: 3 }
    expect(assemblyRowCuts(rows, BY_ID, other).map((c) => c && [c.height, c.width])).toEqual([
      [603, 399],
      [603, 399],
    ])
  })

  it('makes the twin a bare layer of the same piece', () => {
    const twin = layerTwin({ ...banded('E1'), hingingCode: 'B2' }, 'E1')
    expect(twin).toMatchObject({
      height: 600,
      width: 400,
      quantity: 3,
      label: 'Tapa',
      assemblyCode: 'E1',
      assemblyAllowance: true,
      hingingCode: '',
      specialEdges: [],
    })
    expect(twin.edgeBanding.productId).toBe('')
    expect(Object.values(twin.edgeBanding.sides).some(Boolean)).toBe(false)
  })

  it('marks a row whenever its code is written, and unmarks it when cleared', () => {
    expect(withAssemblyCode(row(), 'E1').assemblyAllowance).toBe(true)
    expect(withAssemblyCode(row(), '  ').assemblyAllowance).toBe(false)
    // Filling the column down writes it through the same door.
    const filled = applyField(row(), withAssemblyCode(row(), 'E2'), 'assemblyCode')
    expect(filled).toMatchObject({ assemblyCode: 'E2', assemblyAllowance: true })
  })

  it('leaves an old row unmarked until a layer of its assembly is written', () => {
    const old = row({ assemblyCode: 'E1' })
    expect(spreadAssemblyMark([old, row()])).toEqual([old, row()])
    const joined = spreadAssemblyMark([old, withAssemblyCode(row(), 'e 1')])
    expect(joined[0]?.assemblyAllowance).toBe(true)
    expect(anyAssembly([old])).toBe(false)
    expect(anyAssembly(joined)).toBe(true)
  })

  it('judges only rows already typed in', () => {
    const half = withAssemblyCode(row({ width: '' }), 'E1')
    // The half-typed layer is not reported; the lone complete one is.
    const issues = assemblyRowIssues([banded('E1'), half])
    expect(issues.map((it) => it.message)).toEqual([
      'Ens E1: tiene una sola capa; agrega la otra con el mismo código',
    ])
    expect(issues[0]?.rows).toEqual([0])
  })

  it('sends the mark only on a layer, and signs the assembly the rows belong to', () => {
    const material = { ...emptyMaterial(), uid: 'm1', boardId: '10' }
    const first = banded('E1')
    const plain = buildPayload([material], [row()]).requirements[0]
    expect(plain && 'assemblyAllowance' in plain).toBe(false)
    const built = buildPayload([material], [first, layerTwin(first, 'E1')])
    expect(built.requirements.map((r) => r.assemblyAllowance)).toEqual([true, true])

    const sign = (rows: RequirementForm[]) =>
      signatureOf(
        buildPayload([material], rows).materials,
        buildPayload([material], rows).requirements,
        0,
        1,
      )
    const together = sign([first, layerTwin(first, 'E1')])
    // Renaming the whole assembly's case or spacing keeps the result; regrouping does not.
    expect(sign([withAssemblyCode(first, 'e 1'), layerTwin(first, 'E1')])).toBe(together)
    expect(sign([first, layerTwin(first, 'E2')])).not.toBe(together)
    // A plain workshop code still never stales the result.
    expect(sign([row({ hingingCode: 'B2' })])).toBe(sign([row()]))
  })
})
