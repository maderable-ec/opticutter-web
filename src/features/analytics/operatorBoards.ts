import { pauseReasonLabel } from 'src/features/orders/activities'
import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { localDateKey } from 'src/shared/utils/date'
import { fmtNumber } from 'src/shared/utils/format'
import { fmtDecimal, fmtLocalTime, fmtWeekday } from './format'
import type { OperatorBoard, OperatorOrderTime, SheetKind } from './types'

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

// --- The time behind the row, order by order ---------------------------------------------------
// The cut's time runs from taking an order to its last piece: the load up to the first piece, the
// sawing after. What an operator disputes about their hours is one of those three instants.

const fmtH = (n: number) => `${fmtDecimal(n)} h`

const dayOf = (iso: string) => localDateKey(new Date(iso))

// «mié 10 jun 08:00»: the day too, because the ledger's orders are not grouped by day — a cut left
// half done on Friday ends on Monday.
const when = (iso: string) => `${fmtWeekday(dayOf(iso))} ${fmtLocalTime(iso)}`

// «tomada mié 10 jun 08:00 · primera pieza 08:20 · última 09:00». Without «tomada» on an order cut
// before the activities had clocks: its time starts at its first piece and it has no load.
export const orderSpan = (o: OperatorOrderTime): string => {
  const start = o.takenAt ?? o.firstPieceAt
  const sameDay = (iso: string) => dayOf(iso) === dayOf(start)
  const at = (iso: string) => (sameDay(iso) ? fmtLocalTime(iso) : when(iso))
  return [
    o.takenAt && `tomada ${when(o.takenAt)}`,
    `primera pieza ${o.takenAt ? at(o.firstPieceAt) : when(o.firstPieceAt)}`,
    `última ${at(o.lastPieceAt)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// «0,3 h de carga · 0,4 h de sierra».
export const orderSplit = (o: OperatorOrderTime): string =>
  `${fmtH(o.loadingHours)} de carga · ${fmtH(o.sawingHours)} de sierra`

// «0,3 h en pausa (Sin tableros)», only when the order's cut was paused: time that is NOT in its
// hours.
export const orderPause = (o: OperatorOrderTime): string | undefined => {
  if (o.pauseReasons.length === 0) return undefined
  return `${fmtH(o.pausedHours)} en pausa (${o.pauseReasons.map(pauseReasonLabel).join(', ')})`
}

export const fmtWorkHours = fmtH
