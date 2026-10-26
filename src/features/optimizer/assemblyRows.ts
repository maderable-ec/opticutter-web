// The ensamble rule (`shared/utils/assembly.ts`) over the despiece's rows: each row is one layer, and
// the rows that share an Ens code are one assembly. Everything here works on the WHOLE list, by flat
// index, because an assembly may span materials — a layer of melamina and one of MDP.

import type { EdgeBandingProduct } from 'src/features/products/types'
import {
  type AssemblyIssue,
  type AssemblyLayer,
  type LayerCut,
  assemblyCutSizes,
  assemblyIssues,
  assemblyKey,
} from 'src/shared/utils/assembly'
import type { CutRules } from 'src/shared/utils/cutRules'
import { cloneRequirement, emptyEdgeBanding, selectedSides } from './optimizerForm'
import type { RequirementForm } from './optimizerForm'
import { pieceCutSize } from './pieceFields'

// A row with its measures and quantity typed. One that is not yet is left out of the rule — it
// neither grows nor counts as a layer — so an assembly is not reported broken while being typed.
const complete = (r: RequirementForm): boolean =>
  Number(r.height) > 0 && Number(r.width) > 0 && Number(r.quantity) > 0

const layerOf = (
  r: RequirementForm,
  byId?: Map<string, EdgeBandingProduct>,
  hardMm = 0,
): AssemblyLayer => ({
  key: r.assemblyAllowance && complete(r) ? assemblyKey(r.assemblyCode) : null,
  code: r.assemblyCode ?? '',
  height: Number(r.height),
  width: Number(r.width),
  cut: byId ? pieceCutSize(r, byId, hardMm) : null,
  quantity: Number(r.quantity),
  // What the API bills as a tape: the Canto's sides, and each canto especial with its product.
  banded:
    selectedSides(r.edgeBanding).length > 0 ||
    (r.specialEdges ?? []).some((e) => Number(e.productId) > 0),
})

// The size the saw cuts every row at, by flat index, by the settings' millimetres (`rules`): a layer
// of an assembly grows the allowance and takes its assembly's hard-tape discount; every other row
// is `pieceCutSize`. null while a measure is not a positive number.
export const assemblyRowCuts = (
  rows: RequirementForm[],
  byId: Map<string, EdgeBandingProduct>,
  rules: CutRules,
): (LayerCut | null)[] =>
  assemblyCutSizes(
    rows.map((r) => layerOf(r, byId, rules.hardEdgeCutMm)),
    rules.assemblyAllowanceMm,
  )

// What blocks saving, by assembly, with the flat indices of its rows.
export const assemblyRowIssues = (rows: RequirementForm[]): AssemblyIssue[] =>
  assemblyIssues(rows.map((r) => layerOf(r)))

// Some row is a layer of an assembly: the group explains the allowance once, above its pieces.
export const anyAssembly = (rows: RequirementForm[]): boolean =>
  rows.some((r) => r.assemblyAllowance && !!assemblyKey(r.assemblyCode))

// A row with its Ens code written from the grid: marked as a layer whenever it has one. Every place
// that writes the code goes through here — typing, pasting, filling — so a quote saved before the
// rule keeps its codes unmarked (and its plan) until the seller touches them.
export const withAssemblyCode = (r: RequirementForm, code: string): RequirementForm => ({
  ...r,
  assemblyCode: code,
  assemblyAllowance: !!code.trim(),
})

// Marks the unmarked rows that share a code with a marked one: an old row joins its assembly the
// moment a layer of it is written, instead of being reported as a second, broken assembly. Returns
// the same array when nothing changes.
export const spreadAssemblyMark = (rows: RequirementForm[]): RequirementForm[] => {
  const marked = new Set(
    rows.filter((r) => r.assemblyAllowance).map((r) => assemblyKey(r.assemblyCode)),
  )
  marked.delete(null)
  if (marked.size === 0) return rows
  let changed = false
  const next = rows.map((r) => {
    if (r.assemblyAllowance || !marked.has(assemblyKey(r.assemblyCode))) return r
    changed = true
    return { ...r, assemblyAllowance: true }
  })
  return changed ? next : rows
}

// The bare layer «+ capa» adds under a row: same size, quantity, label and code, and none of the
// work that belongs to the assembled piece — no canto (it is billed once, on the first layer), no
// cantos especiales, no other workshop code.
export const layerTwin = (r: RequirementForm, code: string): RequirementForm => ({
  ...cloneRequirement(r),
  hardEdgeCut: true,
  edgeBanding: emptyEdgeBanding(),
  specialEdges: [],
  hingingCode: '',
  groovingCode: '',
  divisionCode: '',
  assemblyCode: code,
  assemblyAllowance: true,
})
