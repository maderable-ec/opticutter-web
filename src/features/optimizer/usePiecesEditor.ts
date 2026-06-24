import { useCallback, useState } from 'react'

import { cloneRequirement, emptyRequirement, isRequirementEmpty } from './optimizerForm'
import type { MaterialForm, RequirementForm } from './optimizerForm'

// Campos que admiten "rellenar hacia abajo" (aplicar de una fila a varias).
export type FillableField =
  | 'materialUid'
  | 'height'
  | 'width'
  | 'quantity'
  | 'priority'
  | 'label'
  | 'canRotate'
  | 'edgeBanding'
export type FillScope = 'all' | 'selected'

const MAX_HISTORY = 20

// Encapsula la lista de piezas y todas las operaciones de edición masiva (pegar, duplicar, fill-down,
// selección múltiple, foco, historial para undo). Sigue el estilo del proyecto: estado plano +
// actualizaciones inmutables.
export const usePiecesEditor = (materials: MaterialForm[], initial?: RequirementForm[]) => {
  const firstUid = () => materials[0]?.uid ?? ''
  // `initial` solo se usa para hidratar el estado inicial (p. ej. desde el autosave). Pasarlo en
  // renders posteriores no reinicia la lista: la edición posterior manda.
  const [requirements, setRequirements] = useState<RequirementForm[]>(() =>
    initial && initial.length ? initial : [emptyRequirement(firstUid())],
  )
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  // Índice de fila a enfocar tras agregar (lo consume la tabla y luego lo limpia).
  const [focusRow, setFocusRow] = useState<number | null>(null)
  // Stack de historial para undo. Guarda snapshots antes de operaciones estructurales (no por keystroke).
  const [history, setHistory] = useState<RequirementForm[][]>([])

  const clearFocus = useCallback(() => setFocusRow(null), [])

  // Guarda el estado actual en el historial y aplica el updater. No usar en `update` (keystroke).
  const applyWithHistory = (updater: (rs: RequirementForm[]) => RequirementForm[]) => {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), requirements])
    setRequirements(updater)
  }

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setRequirements(prev)
    setSelected(new Set())
  }, [history])

  // Agrega una fila vacía heredando el material de la última (o el primero disponible).
  const add = () => {
    applyWithHistory((rs) => {
      const inheritUid = rs[rs.length - 1]?.materialUid || firstUid()
      return [...rs, emptyRequirement(inheritUid)]
    })
    setFocusRow(requirements.length)
    setSelected(new Set())
  }

  // Agrega filas importadas/pegadas. `replace` sustituye la lista; si no, las anexa (reemplazando una
  // única fila en blanco si fuera el caso).
  const addMany = (rows: RequirementForm[], replace: boolean) => {
    applyWithHistory((rs) => {
      if (replace) return rows.length ? rows : [emptyRequirement(firstUid())]
      if (rs.length === 1 && isRequirementEmpty(rs[0])) return rows.length ? rows : rs
      return [...rs, ...rows]
    })
    setSelected(new Set())
  }

  const remove = (i: number) => {
    applyWithHistory((rs) => rs.filter((_, idx) => idx !== i))
    setSelected(new Set())
  }

  const removeSelected = () => {
    applyWithHistory((rs) => {
      const kept = rs.filter((_, i) => !selected.has(i))
      return kept.length ? kept : [emptyRequirement(firstUid())]
    })
    setSelected(new Set())
  }

  const duplicate = (i: number) => {
    applyWithHistory((rs) => {
      const src = rs[i]
      if (!src) return rs
      return [...rs.slice(0, i + 1), cloneRequirement(src), ...rs.slice(i + 1)]
    })
    setSelected(new Set())
  }

  const duplicateSelected = () => {
    applyWithHistory((rs) => {
      const out: RequirementForm[] = []
      rs.forEach((r, i) => {
        out.push(r)
        if (selected.has(i)) out.push(cloneRequirement(r))
      })
      return out
    })
    setSelected(new Set())
  }

  const update = <K extends keyof RequirementForm>(
    i: number,
    field: K,
    value: RequirementForm[K],
  ) => setRequirements((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

  // Aplica el valor de la fila origen (primera, o primera seleccionada) al resto del alcance.
  const fillDown = (field: FillableField, scope: FillScope) => {
    applyWithHistory((rs) => {
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

  // Copia el valor del campo de la fila `srcIndex` a las filas entre srcIndex y targetIndex
  // (inclusive), sin tocar el origen. Acotado a filas existentes (no crea nuevas). Lo usa el
  // tirador de arrastre ("fill handle") de la tabla.
  const fillRange = (srcIndex: number, targetIndex: number, field: FillableField) => {
    if (srcIndex === targetIndex) return
    applyWithHistory((rs) => {
      const src = rs[srcIndex]
      if (!src) return rs
      const lo = Math.min(srcIndex, targetIndex)
      const hi = Math.max(srcIndex, targetIndex)
      return rs.map((r, i) => {
        if (i < lo || i > hi || i === srcIndex) return r
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
    setSelected(new Set())
  }

  const clear = () => {
    applyWithHistory(() => [emptyRequirement(firstUid())])
    setSelected(new Set())
  }

  // Pega una columna de valores en el campo `field` empezando en `startIndex`. Sobreescribe las
  // filas existentes y crea nuevas (clonadas de la fila de origen) solo cuando se acaban.
  const pasteIntoField = (
    startIndex: number,
    field: 'height' | 'width' | 'quantity' | 'priority' | 'label',
    rawValues: string[],
  ) => {
    applyWithHistory((rs) => {
      if (rawValues.length === 0 || startIndex >= rs.length) return rs
      const src = rs[startIndex]
      const result = [...rs]
      const toValue = (s: string): string | number => {
        if (field === 'label') return s.trim()
        const n = Number(s.trim().replace(',', '.'))
        return Number.isFinite(n) ? n : s.trim()
      }
      rawValues.forEach((val, i) => {
        const target = startIndex + i
        if (target < result.length) {
          result[target] = { ...result[target], [field]: toValue(val) }
        } else {
          result.push({ ...cloneRequirement(src), [field]: toValue(val) })
        }
      })
      return result
    })
    setSelected(new Set())
  }

  // Pega filas completas empezando en `startIndex`. Sobreescribe las existentes y agrega al final.
  const pasteRows = (startIndex: number, rows: RequirementForm[]) => {
    applyWithHistory((rs) => {
      if (rows.length === 0) return rs
      const result = [...rs]
      rows.forEach((row, i) => {
        const target = startIndex + i
        if (target < result.length) {
          result[target] = row
        } else {
          result.push(row)
        }
      })
      return result
    })
    setSelected(new Set())
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
    fillRange,
    clear,
    pasteIntoField,
    pasteRows,
    undo,
    canUndo: history.length > 0,
    toggleSelect,
    selectAll,
    reassignOnMaterialRemoval,
  }
}

export type PiecesEditor = ReturnType<typeof usePiecesEditor>
