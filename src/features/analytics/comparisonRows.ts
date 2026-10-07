import { fmtMeters, fmtMoney, fmtNumber, fmtPercent } from 'src/shared/utils/format'
import type { ComparisonGroup, ComparisonRow } from './components/BranchComparisonTable'
import { fmtDecimal, fmtInt, fmtMinuteOfDay, fmtRate, fmtShare } from './format'
import type { BranchFigures } from './types'

// The rows of the branch comparison, once each: the Resumen and Producción pick from these, so a
// figure reads the same in both.

const fmtH = (n: number) => `${fmtDecimal(n)} h`
const fmtBoards = (n: number) => fmtNumber(n, 1, 0)

// Of a branch's whole workday, how much the saw was cutting.
const workedShare = (f: BranchFigures) => {
  const { effectiveHours, pausedHours } = f.production
  const span = effectiveHours + pausedHours
  return span > 0 ? (effectiveHours / span) * 100 : 0
}

// An average time of day means nothing over no day at all.
const timeOfDay =
  (pick: (f: BranchFigures) => number) =>
  (_: number, f: BranchFigures): string =>
    f.production.daysWorked > 0 ? fmtMinuteOfDay(pick(f)) : '—'

const ROWS = {
  cash: {
    label: 'Efectivo',
    value: (f) => f.sales.cash,
    format: (n) => fmtMoney(n),
    detail: (f) => fmtShare(f.sales.cash, f.sales.total),
    better: 'higher',
  },
  credit: {
    label: 'Crédito',
    value: (f) => f.sales.credit,
    format: (n) => fmtMoney(n),
    detail: (f) => fmtShare(f.sales.credit, f.sales.total),
    // Selling more on credit is not doing better: it is money still owed.
    better: 'none',
  },
  sold: {
    label: 'Total vendido',
    value: (f) => f.sales.total,
    format: (n) => fmtMoney(n),
    detail: (f) =>
      f.sales.paidOrders > 0
        ? `${fmtInt(f.sales.paidOrders)} ${f.sales.paidOrders === 1 ? 'orden' : 'órdenes'}`
        : undefined,
    better: 'higher',
  },
  entered: {
    label: 'Ingresadas',
    value: (f) => f.orders.entered,
    format: fmtInt,
    better: 'higher',
  },
  finished: {
    label: 'Terminadas',
    value: (f) => f.orders.finished,
    format: fmtInt,
    better: 'higher',
  },
  boards: {
    label: 'Tableros procesados',
    value: (f) => f.production.boards,
    format: fmtBoards,
    better: 'higher',
  },
  meters: {
    label: 'Metros de corte',
    value: (f) => f.production.cutLinearM,
    format: (n) => fmtMeters(n, 0),
    better: 'higher',
  },
  banded: {
    label: 'Metros de canteo',
    value: (f) => f.production.bandedLinearM,
    format: (n) => fmtMeters(n, 0),
    better: 'higher',
  },
  ordersBanded: {
    label: 'Órdenes canteadas',
    value: (f) => f.production.ordersBanded,
    format: fmtInt,
    better: 'higher',
  },
  ordersAdditional: {
    label: 'Adicionales terminados',
    value: (f) => f.production.ordersAdditional,
    format: fmtInt,
    better: 'higher',
  },
  effective: {
    label: 'Horas efectivas',
    value: (f) => f.production.effectiveHours,
    format: fmtH,
    better: 'higher',
  },
  paused: {
    label: 'Horas paradas',
    value: (f) => f.production.pausedHours,
    format: fmtH,
    better: 'lower',
  },
  worked: {
    label: 'Jornada cortando',
    value: workedShare,
    format: (n) => fmtPercent(n, 0),
    better: 'higher',
  },
  metersPerHour: {
    label: 'Metros por hora',
    value: (f) => f.production.metersPerHour,
    format: fmtDecimal,
    better: 'higher',
  },
  boardsPerHour: {
    label: 'Tableros por hora',
    value: (f) => f.production.boardsPerHour,
    format: fmtRate,
    better: 'higher',
  },
  start: {
    label: 'Inicio promedio',
    value: (f) => f.production.averageStartMinute,
    format: timeOfDay((f) => f.production.averageStartMinute),
    better: 'none',
  },
  end: {
    label: 'Fin promedio',
    value: (f) => f.production.averageEndMinute,
    format: timeOfDay((f) => f.production.averageEndMinute),
    better: 'none',
  },
  days: {
    label: 'Días con producción',
    value: (f) => f.production.daysWorked,
    format: fmtInt,
    better: 'higher',
  },
} satisfies Record<string, ComparisonRow>

// Resumen: who sells more, who produces more and who does it faster.
export const SUMMARY_GROUPS: ComparisonGroup[] = [
  { title: 'Ventas', rows: [ROWS.cash, ROWS.credit, ROWS.sold] },
  { title: 'Órdenes', rows: [ROWS.entered, ROWS.finished] },
  {
    title: 'Producción',
    rows: [
      ROWS.boards,
      ROWS.meters,
      ROWS.banded,
      ROWS.ordersBanded,
      ROWS.ordersAdditional,
      ROWS.effective,
      ROWS.metersPerHour,
      ROWS.boardsPerHour,
    ],
  },
]

// Producción: the workday behind those figures.
export const PRODUCTION_GROUPS: ComparisonGroup[] = [
  {
    title: 'Producción',
    rows: [
      ROWS.boards,
      ROWS.meters,
      ROWS.banded,
      ROWS.ordersBanded,
      ROWS.ordersAdditional,
      ROWS.finished,
    ],
  },
  {
    title: 'Jornada',
    rows: [ROWS.effective, ROWS.paused, ROWS.worked, ROWS.start, ROWS.end, ROWS.days],
  },
  { title: 'Rendimiento', rows: [ROWS.boardsPerHour, ROWS.metersPerHour] },
]
