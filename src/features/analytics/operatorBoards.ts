import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { fmtNumber } from 'src/shared/utils/format'
import { fmtLocalTime } from './format'
import type { OperatorBoard, SheetKind } from './types'

// The ledger behind an operator's row, read sheet by sheet: the rule of the count is that a sheet
// counts once every piece is marked, on the day of its last mark, for whoever made that mark.

export const SHEET_KIND_LABEL: Record<SheetKind, string> = {
  whole: 'Entero',
  half: 'Medio',
  offcut: 'Retazo',
}

// What a sheet weighs in the count: «1», «0,5», «0».
export const fmtWeight = (n: number) => fmtNumber(n, 1, 0)

// Millimetres as the shop writes them, no thousands separator: «1220×2440».
const mm = (n: number) => String(Math.round(n))

// The catalog's name, or what the sheet is when it has none (a retazo, a hand-measured sheet).
export const sheetMaterial = (s: OperatorBoard): string =>
  s.materialName ??
  `${s.kind === 'offcut' ? 'Retazo' : 'Medida manual'} ${mm(s.width)}×${mm(s.height)}`

// Why the sheet counts or not, as a badge. The name of who closed it and how many pieces are
// missing are the point of the row, so they go in the badge itself.
export const sheetBadge = (s: OperatorBoard): StatusConfigEntry => {
  switch (s.status) {
    case 'credited':
      return { tone: 'success', icon: 'done', label: 'Cuenta' }
    case 'credited_to_other':
      return { tone: 'neutral', icon: 'profile', label: `La cerró ${s.closedBy || 'otro usuario'}` }
    case 'incomplete':
      return {
        tone: 'progress',
        icon: 'pending',
        label: s.piecesPending === 1 ? 'Falta 1 pieza' : `Faltan ${s.piecesPending} piezas`,
      }
    case 'outside_range':
      return { tone: 'neutral', icon: 'expiring', label: 'Se cerró después del período' }
  }
}

// «12 de 12 piezas suyas · 4 de Luigi · 2 sin marcar»: who marked what on it.
export const sheetPieces = (s: OperatorBoard): string =>
  [
    `${s.piecesMine} de ${s.piecesTotal} ${s.piecesTotal === 1 ? 'pieza suya' : 'piezas suyas'}`,
    s.piecesMineInRange < s.piecesMine &&
      `${s.piecesMine - s.piecesMineInRange} antes o después del período`,
    s.piecesByOthers > 0 && `${s.piecesByOthers} de ${s.otherCutters.join(', ') || 'otro usuario'}`,
    s.piecesPending > 0 && `${s.piecesPending} sin marcar`,
  ]
    .filter(Boolean)
    .join(' · ')

// When it closed, or the operator's last mark while it is still open.
export const sheetTime = (s: OperatorBoard): string =>
  s.doneAt ? `cerrada ${fmtLocalTime(s.doneAt)}` : `su última marca ${fmtLocalTime(s.myLastCutAt)}`
