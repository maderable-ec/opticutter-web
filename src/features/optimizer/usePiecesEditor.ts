import { useCallback, useState } from 'react'

import { cloneRequirement, emptyRequirement, isRequirementEmpty } from './optimizerForm'
import type { MaterialForm, RequirementForm } from './optimizerForm'

// Campos que admiten "rellenar hacia abajo" (aplicar de una fila a varias).
export type FillableField = 'materialUid' | 'canRotate' | 'edgeBanding'
export type FillScope = 'all' | 'selected'

// Encapsula la lista de piezas y todas las operaciones de edición masiva (pegar, duplicar, fill-down,
// selección múltiple, foco). Sigue el estilo del proyecto: estado plano + actualizaciones inmutables.
export const usePiecesEditor = (materials: MaterialForm[]) => {
  const firstUid = () => materials[0]?.uid ?? ''
  const [requirements, setRequirements] = useState<RequirementForm[]>(() => [
    emptyRequirement(firstUid()),
  ])
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  // Índice de fila a enfocar tras agregar (lo consume la tabla y luego lo limpia).
  const [focusRow, setFocusRow] = useState<number | null>(null)

  const clearSelection = () => setSelected(new Set())
  const clearFocus = useCallback(() => setFocusRow(null), [])

  // Agrega una fila vacía heredando el material de la última (o el primero disponible).
  const add = () => {
    setRequirements((rs) => {
      const inheritUid = rs[rs.length - 1]?.materialUid || firstUid()
      return [...rs, emptyRequirement(inheritUid)]
    })
    setFocusRow(requirements.length)
    clearSelection()
  }

  // Agrega filas importadas/pegadas. `replace` sustituye la lista; si no, las anexa (reemplazando una
  // única fila en blanco si fuera el caso).
  const addMany = (rows: RequirementForm[], replace: boolean) => {
    setRequirements((rs) => {
      if (replace) return rows.length ? rows : [emptyRequirement(firstUid())]
      if (rs.length === 1 && isRequirementEmpty(rs[0])) return rows.length ? rows : rs
      return [...rs, ...rows]
    })
    clearSelection()
  }

  const remove = (i: number) => {
    setRequirements((rs) => rs.filter((_, idx) => idx !== i))
    clearSelection()
  }

  const removeSelected = () => {
    setRequirements((rs) => {
      const kept = rs.filter((_, i) => !selected.has(i))
      return kept.length ? kept : [emptyRequirement(firstUid())]
    })
    clearSelection()
  }

  const duplicate = (i: number) => {
    setRequirements((rs) => {
      const src = rs[i]
      if (!src) return rs
      return [...rs.slice(0, i + 1), cloneRequirement(src), ...rs.slice(i + 1)]
    })
    clearSelection()
  }

  const duplicateSelected = () => {
    setRequirements((rs) => {
      const out: RequirementForm[] = []
      rs.forEach((r, i) => {
        out.push(r)
        if (selected.has(i)) out.push(cloneRequirement(r))
      })
      return out
    })
    clearSelection()
  }

  const update = <K extends keyof RequirementForm>(
    i: number,
    field: K,
    value: RequirementForm[K],
  ) => setRequirements((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

  // Aplica el valor de la fila origen (primera, o primera seleccionada) al resto del alcance.
  const fillDown = (field: FillableField, scope: FillScope) => {
    setRequirements((rs) => {
      const hasSel = scope === 'selected' && selected.size > 0
      const srcIndex = hasSel ? Math.min(...selected) : 0
      const src = rs[srcIndex]
      if (!src) return rs
      const inTarget = (i: number) => (hasSel ? selected.has(i) : true)
      return rs.map((r, i) => {
        if (i === srcIndex || !inTarget(i)) return r
        if (field === 'edgeBanding') {
          return {
            ...r,
            edgeBanding: {
              productId: src.edgeBanding.productId,
              sides: { ...src.edgeBanding.sides },
            },
          }
        }
        return { ...r, [field]: src[field] }
      })
    })
  }

  const clear = () => {
    setRequirements([emptyRequirement(firstUid())])
    clearSelection()
  }

  const toggleSelect = (i: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const selectAll = (checked: boolean) =>
    setSelected(checked ? new Set(requirements.map((_, i) => i)) : new Set())

  // Reapunta las piezas cuando se elimina un material (espeja la lógica previa de OptimizerPage).
  const reassignOnMaterialRemoval = (removedUid: string, remaining: MaterialForm[]) =>
    setRequirements((rs) =>
      rs.map((r) => {
        const orphaned = r.materialUid === removedUid || r.materialUid === ''
        if (remaining.length === 1 && orphaned) return { ...r, materialUid: remaining[0].uid }
        if (r.materialUid === removedUid) return { ...r, materialUid: '' }
        return r
      }),
    )

  return {
    requirements,
    selected,
    focusRow,
    clearFocus,
    add,
    addMany,
    remove,
    removeSelected,
    duplicate,
    duplicateSelected,
    update,
    fillDown,
    clear,
    toggleSelect,
    selectAll,
    reassignOnMaterialRemoval,
  }
}

export type PiecesEditor = ReturnType<typeof usePiecesEditor>
