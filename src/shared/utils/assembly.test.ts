import { describe, expect, it } from 'vitest'
import {
  type AssemblyLayer,
  assemblyCutHint,
  assemblyCutSizes,
  assemblyFinalLabel,
  assemblyIssues,
  assemblyKey,
  nextAssemblyCode,
} from './assembly'
import { DEFAULT_CUT_RULES } from './cutRules'
import { cutSize, type SideBandTypes } from './hardEdges'

// Mirrors `tests/unit/test_assembly.py` in the API: same rule, same cases, at the default
// millimetres (5 large, 1 short per hard side) unless a case says otherwise.

const RULES = DEFAULT_CUT_RULES

const layer = (
  code: string | null,
  types: SideBandTypes = {},
  over: Partial<AssemblyLayer> = {},
): AssemblyLayer => {
  const height = over.height ?? 600
  const width = over.width ?? 400
  return {
    key: assemblyKey(code),
    code: code ?? '',
    height,
    width,
    cut: cutSize(height, width, types, RULES.hardEdgeCutMm),
    quantity: 3,
    banded: Object.keys(types).length > 0,
    ...over,
  }
}

const sizes = (layers: AssemblyLayer[], allowanceMm = RULES.assemblyAllowanceMm) =>
  assemblyCutSizes(layers, allowanceMm).map((c) => (c ? [c.height, c.width] : null))

const HARD_LONG: SideBandTypes = { left: 'Hard', right: 'Hard' }

describe('assembly cut size', () => {
  it('grows five millimetres per measure by default', () => {
    expect(RULES.assemblyAllowanceMm).toBe(5)
  })

  it('grows by the allowance of the settings', () => {
    // 3 mm large: 600 + 3, and 400 + 3 − 2 for the shared hard discount.
    expect(sizes([layer('E1', HARD_LONG), layer('E1')], 3)).toEqual([
      [603, 401],
      [603, 401],
    ])
  })

  it('gives both layers the hard discount of the one with the canto', () => {
    expect(sizes([layer('E1', HARD_LONG), layer('E1')])).toEqual([
      [605, 403],
      [605, 403],
    ])
    expect(sizes([layer('E1'), layer('E1', HARD_LONG)])).toEqual([
      [605, 403],
      [605, 403],
    ])
  })

  it('takes a short side off the largo', () => {
    expect(sizes([layer('E1', { top: 'Hard' }), layer('E1')])).toEqual([
      [604, 405],
      [604, 405],
    ])
  })

  it('only grows with no canto or a soft one', () => {
    expect(sizes([layer('E1'), layer('E1')])).toEqual([
      [605, 405],
      [605, 405],
    ])
    expect(sizes([layer('E1', { left: 'Soft', right: 'Soft' }), layer('E1')])).toEqual([
      [605, 405],
      [605, 405],
    ])
  })

  it('takes the largest discount when two layers carry a canto', () => {
    expect(sizes([layer('E1', { left: 'Hard' }), layer('E1', HARD_LONG)])).toEqual([
      [605, 403],
      [605, 403],
    ])
  })

  it('grows each layer from its own size when they disagree', () => {
    expect(sizes([layer('E1', HARD_LONG), layer('E1', {}, { width: 398 })])).toEqual([
      [605, 403],
      [605, 401],
    ])
  })

  it('leaves a row outside the rule at its own cut', () => {
    const out = assemblyCutSizes([layer(null, HARD_LONG)], RULES.assemblyAllowanceMm)[0]
    expect(out).toMatchObject({ height: 600, width: 398, allowance: 0, widthHard: 2 })
  })

  it('reports what the layer grew and what the tapes took back', () => {
    const [cut] = assemblyCutSizes([layer('E1', HARD_LONG), layer('E1')], RULES.assemblyAllowanceMm)
    expect(cut).toMatchObject({
      heightOff: -5,
      widthOff: -3,
      allowance: 5,
      heightHard: 0,
      widthHard: 2,
    })
  })

  it('compares codes without spaces or case', () => {
    expect(assemblyKey(' E 1 ')).toBe('e1')
    expect(assemblyKey('')).toBeNull()
    expect(sizes([layer('E 1', HARD_LONG), layer('e1')])).toEqual([
      [605, 403],
      [605, 403],
    ])
  })

  it('explains the cut in words', () => {
    expect(assemblyCutHint(400, 403, 2, RULES)).toBe(
      'Se corta a 403 mm: 400 + 5 mm de ensamble − 2 mm por 2 cantos duros. Escribe siempre la medida final.',
    )
    expect(assemblyCutHint(600, 605, 0, RULES)).toBe(
      'Se corta a 605 mm: 600 + 5 mm de ensamble. Escribe siempre la medida final.',
    )
    const other = { hardEdgeCutMm: 2, assemblyAllowanceMm: 3 }
    expect(assemblyCutHint(400, 399, 4, other)).toContain(
      '400 + 3 mm de ensamble − 4 mm por 2 cantos duros',
    )
  })
})

describe('assembly issues', () => {
  it('finds nothing wrong with a sound assembly or rows outside the rule', () => {
    expect(assemblyIssues([layer('E1', HARD_LONG), layer('E1')])).toEqual([])
    expect(assemblyIssues([layer(null), layer(null)])).toEqual([])
  })

  it.each([
    [[layer('E1')], 'Ens E1: tiene una sola capa'],
    [
      [layer('E1'), layer('E1', {}, { width: 398 })],
      'Ens E1: las capas no tienen la misma medida (600×400 / 600×398)',
    ],
    [
      [layer('E1'), layer('E1', {}, { quantity: 2 })],
      'Ens E1: las capas no tienen la misma cantidad (3 / 2)',
    ],
    [
      [layer('E1', { left: 'Hard' }), layer('E1', { top: 'Soft' })],
      'Ens E1: el canto va en una sola capa y lo tienen 2',
    ],
  ])('names each problem (%#)', (layers, message) => {
    const [issue] = assemblyIssues(layers)
    expect(issue?.message.startsWith(message)).toBe(true)
    expect(issue?.rows).toEqual(layers.map((_, i) => i))
  })
})

describe('assembly codes and labels', () => {
  it('numbers the next assembly after the highest E-code', () => {
    expect(nextAssemblyCode([])).toBe('E1')
    expect(nextAssemblyCode(['E1', 'e 3', 'X9', ''])).toBe('E4')
  })

  it('prints the final size under an assembly cut at another size', () => {
    const placed = {
      assemblyCode: 'E1',
      width: 403,
      height: 605,
      originalWidth: 400,
      originalHeight: 600,
      rotated: false,
    }
    expect(assemblyFinalLabel(placed)).toBe('MF:600x400')
    // Turned on the sheet: still the piece's own largo × ancho.
    expect(assemblyFinalLabel({ ...placed, width: 605, height: 403, rotated: true })).toBe(
      'MF:600x400',
    )
    expect(assemblyFinalLabel({ ...placed, assemblyCode: null })).toBe('')
    expect(assemblyFinalLabel({ ...placed, width: 400, height: 600 })).toBe('')
  })
})
