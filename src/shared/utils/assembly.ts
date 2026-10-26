// Ensamble: the layers of one assembled piece, cut alike and large. An assembled piece (two or
// more boards glued face to face, banded once it is whole) is typed as one row per layer, and the
// rows that share an Ens code are one assembly. The shop cuts every layer large on each measure —
// by the setting's millimetres (`cutRules.ts`, 5 by default) — to square the glued block
// afterwards; the seller still types the FINAL size. The API
// does it (`opticutter-api/src/modules/optimizations/assembly.py`) and this is its mirror, so the
// despiece can show the cut size and refuse a broken assembly before anything is saved. Keep the
// two in step.
//
// The canto goes on the assembled piece, so it is typed on ONE row — yet a hard tape still takes
// its millimetre off every layer, or they would come out of the saw at different sizes. Each
// assembly takes, per axis, the largest discount any of its rows gets (`hardEdges.ts`) and every
// layer is cut `final + allowance − that`: at the defaults, 600×400 with `2L CD` and its bare twin
// are both cut 605×403.
//
// Only rows marked `assemblyAllowance` follow the rule: the grid marks every row whose Ens code it
// writes, and a quote saved before keeps its codes unmarked, and its plan.

import type { DrawablePiece } from './cutDrawing'
import type { CutRules } from './cutRules'
import { hardTapes, isResized, placedCut, type CutSize } from './hardEdges'

// The code as the rule compares it: no whitespace, case-insensitive ("E 1" is "e1").
export const assemblyKey = (code: string | null | undefined): string | null => {
  const key = (code ?? '').replace(/\s+/g, '').toLowerCase()
  return key || null
}

// One cut-list row as the rule sees it. `key` is null for a row outside the rule (no code, or a code
// saved before the mark). `cut` is the row's own (hard tapes only); null while a measure is not a
// positive number, and such a row neither grows nor lends a discount.
export interface AssemblyLayer {
  key: string | null
  code: string
  height: number
  width: number
  cut: CutSize | null
  quantity: number
  banded: boolean
}

// What the saw cuts for one row. `heightOff`/`widthOff` stay "final − cut", so on a layer they go
// negative; `allowance` is what the row grew on each measure (0 outside an assembly) and
// `heightHard`/`widthHard` what hard tapes took back off — the assembly's, on a layer.
export interface LayerCut extends CutSize {
  allowance: number
  heightHard: number
  widthHard: number
}

const ownCut = (cut: CutSize): LayerCut => ({
  ...cut,
  allowance: 0,
  heightHard: cut.heightOff,
  widthHard: cut.widthOff,
})

// The cut of every row, parallel to `layers`; a layer grows `allowanceMm` on each measure (the
// setting, `CutRules.assemblyAllowanceMm`). Never refuses: rows of one assembly that disagree on
// their size (mid-edit, or read back) each grow from their own — `assemblyIssues` is what blocks
// saving them.
export const assemblyCutSizes = (
  layers: AssemblyLayer[],
  allowanceMm: number,
): (LayerCut | null)[] => {
  const hard = new Map<string, { height: number; width: number }>()
  for (const l of layers) {
    if (l.key === null || !l.cut) continue
    const prev = hard.get(l.key) ?? { height: 0, width: 0 }
    hard.set(l.key, {
      height: Math.max(prev.height, l.cut.heightOff),
      width: Math.max(prev.width, l.cut.widthOff),
    })
  }
  return layers.map((l) => {
    if (!l.cut) return null
    if (l.key === null) return ownCut(l.cut)
    const { height: hh, width: hw } = hard.get(l.key) ?? { height: 0, width: 0 }
    const height = l.height + allowanceMm - hh
    const width = l.width + allowanceMm - hw
    return {
      height,
      width,
      heightOff: l.height - height,
      widthOff: l.width - width,
      allowance: allowanceMm,
      heightHard: hh,
      widthHard: hw,
    }
  })
}

export interface AssemblyIssue {
  key: string
  message: string
  // Indices into the layers the issue is about (the whole assembly).
  rows: number[]
}

// What is wrong with each assembly, worded as the API words it (`assembly_issues`): its layers share
// their final size and quantity, the canto goes on one of them, and there are at least two.
export const assemblyIssues = (layers: AssemblyLayer[]): AssemblyIssue[] => {
  const groups = new Map<string, number[]>()
  layers.forEach((l, i) => {
    if (l.key !== null) groups.set(l.key, [...(groups.get(l.key) ?? []), i])
  })
  const issues: AssemblyIssue[] = []
  for (const [key, rows] of groups) {
    const members = rows.flatMap((i) => layers[i] ?? [])
    const name = `Ens ${(members[0]?.code ?? '').trim()}`
    const add = (message: string) => issues.push({ key, message: `${name}: ${message}`, rows })
    if (rows.length < 2) {
      add('tiene una sola capa; agrega la otra con el mismo código')
      continue
    }
    const sizes = [...new Set(members.map((m) => `${m.height}×${m.width}`))]
    if (sizes.length > 1) add(`las capas no tienen la misma medida (${sizes.join(' / ')})`)
    const quantities = [...new Set(members.map((m) => m.quantity))]
    if (quantities.length > 1)
      add(`las capas no tienen la misma cantidad (${quantities.join(' / ')})`)
    const banded = members.filter((m) => m.banded).length
    if (banded > 1) add(`el canto va en una sola capa y lo tienen ${banded}`)
  }
  return issues
}

// The code «+ capa» gives a row that has none: the next E-number after the highest in use.
export const nextAssemblyCode = (codes: Iterable<string>): string => {
  let max = 0
  for (const code of codes) {
    const m = /^e(\d+)$/.exec(assemblyKey(code) ?? '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `E${max + 1}`
}

// «Se corta a 403 mm: 400 + 5 de ensamble − 2 por cantos duros.» — what the ✂ next to a measure
// explains, for a layer of an assembly (`hardEdges.cutHint` says it for a hard tape alone). `hard`
// is what the assembly's hard tapes took off that measure.
export const assemblyCutHint = (
  final: number,
  cut: number,
  hard: number,
  rules: CutRules,
): string => {
  const off = hard > 0 ? ` − ${hard} mm por ${hardTapes(hard, rules.hardEdgeCutMm)}` : ''
  return `Se corta a ${cut} mm: ${final} + ${rules.assemblyAllowanceMm} mm de ensamble${off}. Escribe siempre la medida final.`
}

// "MF:600x400" — the final size (largo × ancho, as ordered) printed under an assembly's code on the
// sheet, so the cutter and the bander know what to square the glued block to. Only on a piece with
// an Ens code that is cut at another size; '' elsewhere.
export const assemblyFinalLabel = (
  p: Pick<
    DrawablePiece,
    'assemblyCode' | 'width' | 'height' | 'originalWidth' | 'originalHeight' | 'rotated'
  >,
): string =>
  p.assemblyCode?.trim() && isResized(placedCut(p))
    ? `MF:${Math.round(p.originalHeight)}x${Math.round(p.originalWidth)}`
    : ''
