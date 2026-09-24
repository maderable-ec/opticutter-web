import type { MaterialSummary, UnplacedPiece } from './types'

import { CAlert } from '@coreui/react'

// Pieces the plan does NOT cut: bigger than their board, or a group of retazos that ran out.
//
// An error, not a warning. It used to be yellow and to say the rest of the plan could be quoted as
// it was — and pre-order 157 went out to the client with five pieces of 2785 mm on a board whose
// useful length is 2780. A quote with any of these is now refused: the wizard does not reach
// Cotización and the API answers 422. So this box has one job, to say exactly what to fix.
//
// Rendered above the diagram, not below it, because it changes what to do next rather than
// describing what was done.

interface Props {
  unplaced?: UnplacedPiece[]
  materialsSummary?: MaterialSummary[]
}

// The material's name as the API explains it; failing that, its summary row. Undefined rather than
// the key when neither exists — which is exactly what happens when NONE of a material's pieces
// fit, so it produced no sheet. The key is an internal uid and naming it would be worse than
// saying nothing.
const materialName = (u: UnplacedPiece, summary?: MaterialSummary[]): string | undefined => {
  if (u.materialName) return u.materialName
  const m = summary?.find((x) => x.materialKey === u.materialKey)
  if (!m) return undefined
  return m.productName ?? m.productCode ?? `${m.width}×${m.height} mm`
}

// `piece_3` is the id the optimizer gives a row without a label, numbered inside its material
// group: no screen shows it, so it would only send the seller looking for it.
const pieceLabel = (label: string | null): string =>
  label && !/^piece_\d+$/.test(label) ? label : 'pieza'

const why = (u: UnplacedPiece): string | undefined => {
  if (u.reason === 'out_of_stock') return 'no alcanzan los retazos'
  if (u.reason === 'pending') return 'quedó fuera del ajuste manual'
  if (u.usableHeight == null || u.usableWidth == null) return undefined
  const useful = `más grande que el área útil (${u.usableHeight}×${u.usableWidth} mm)`
  return u.reason === 'larger_than_trimmed_sheet' ? `${useful} · entraría sin refilar` : useful
}

// What the seller can do about it, only the ways out that apply to these pieces.
const actions = (unplaced: UnplacedPiece[]): string => {
  const reasons = new Set(unplaced.map((u) => u.reason ?? 'larger_than_sheet'))
  const out: string[] = []
  if (reasons.has('larger_than_sheet') || reasons.has('larger_than_trimmed_sheet'))
    out.push('corrige la medida', 'cambia de tablero')
  if (reasons.has('larger_than_trimmed_sheet')) out.push('activa «sin refilar» en ese material')
  if (reasons.has('out_of_stock'))
    out.push('sube la cantidad de retazos', 'agrega un tablero de catálogo al grupo')
  if (reasons.has('pending')) out.push('colócalas en el ajuste manual', 'descarta el ajuste')
  out.push('quita estas piezas')
  const sentence = `${out.slice(0, -1).join(', ')} o ${out[out.length - 1]}.`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

const UnplacedPiecesAlert = ({ unplaced, materialsSummary }: Props) => {
  if (!unplaced?.length) return null

  const total = unplaced.reduce((acc, u) => acc + u.quantity, 0)

  return (
    <CAlert color="danger" className="py-2">
      <div className="fw-semibold mb-1">
        {total === 1 ? 'Una pieza no entra' : `${total} piezas no entran`} en el material
      </div>
      <ul className="mb-1 ps-3 small">
        {unplaced.map((u) => {
          const material = materialName(u, materialsSummary)
          const reason = why(u)
          return (
            <li key={`${u.materialKey}-${u.label}-${u.height}x${u.width}`}>
              <strong>{u.quantity}×</strong> {pieceLabel(u.label)} {u.height}×{u.width} mm
              {material ? ` · ${material}` : ''}
              {reason && <span className="text-body-secondary"> — {reason}</span>}
            </li>
          )
        })}
      </ul>
      <div className="small">{actions(unplaced)}</div>
    </CAlert>
  )
}

export default UnplacedPiecesAlert
