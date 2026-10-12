import { fmtMeters, fmtMoney, fmtNumber } from 'src/shared/utils/format'
import type { ComparisonGroup, ComparisonRow } from './components/BranchComparisonTable'
import { fmtDecimal, fmtInt, fmtMinuteOfDay, fmtRate, fmtShare } from './format'
import type { BranchFigures } from './types'

// The rows of the branch comparison, once each: the Resumen and Producción pick from these, so a
// figure reads the same in both.

const fmtH = (n: number) => `${fmtDecimal(n)} h`
const fmtBoards = (n: number) => fmtNumber(n, 1, 0)

// Of the cut's time, how much went to pulling the sheets and loading the saw.
const loadingShare = (f: BranchFigures) =>
  f.production.workHours > 0
    ? fmtShare(f.production.loadingHours, f.production.workHours)
    : undefined

// An average time of day means nothing over no day at all.
const timeOfDay =
  (pick: (f: BranchFigures) => number) =>
  (_: number, f: BranchFigures): string =>
    f.production.daysWorked > 0 ? fmtMinuteOfDay(pick(f)) : '—'

const ROWS = {
  // The sale as it was sold: on the spot (cash and transfer) and on credit. The two add up to the
  // total below.
  cash: {
    label: 'Al contado',
    value: (f) => f.sales.cash,
    format: (n) => fmtMoney(n),
    detail: (f) => fmtShare(f.sales.cash, f.sales.total),
    better: 'higher',
  },
  credit: {
    label: 'Vendido a crédito',
    value: (f) => f.sales.credit,
    format: (n) => fmtMoney(n),
    detail: (f) => fmtShare(f.sales.credit, f.sales.total),
    // Selling more on credit is not doing better: it is money still owed.
    better: 'none',
  },
  // Credit paid back in the period, whenever it was sold: the day the money came in.
  collected: {
    label: 'Abonos recibidos',
    value: (f) => f.sales.creditCollected,
    format: (n) => fmtMoney(n),
    better: 'higher',
  },
  // Not a figure of the period: what clients owe right now, which comes down with each payment.
  outstanding: {
    label: 'Crédito pendiente (hoy)',
    value: (f) => f.sales.creditOutstanding,
    format: (n) => fmtMoney(n),
    detail: (f) =>
      f.sales.creditOutstandingOrders > 0
        ? `${fmtInt(f.sales.creditOutstandingOrders)} ${
            f.sales.creditOutstandingOrders === 1 ? 'orden' : 'órdenes'
          }`
        : undefined,
    better: 'lower',
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
  // From taking an order to its last piece: the load and the sawing together. It is what the two
  // rates below divide by, so it is no better high or low on its own.
  work: {
    label: 'Tiempo de corte',
    value: (f) => f.production.workHours,
    format: fmtH,
    better: 'none',
  },
  loading: {
    label: 'Carga',
    value: (f) => f.production.loadingHours,
    format: fmtH,
    detail: loadingShare,
    better: 'none',
  },
  sawing: {
    label: 'Sierra',
    value: (f) => f.production.sawingHours,
    format: fmtH,
    better: 'none',
  },
  // Working hours the cut spent in a pause the shop registered: no boards, no tape, a machine down.
  paused: {
    label: 'En pausa',
    value: (f) => f.production.pausedHours,
    format: fmtH,
    better: 'lower',
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
  {
    title: 'Ventas',
    rows: [ROWS.cash, ROWS.credit, ROWS.sold, ROWS.collected, ROWS.outstanding],
  },
  { title: 'Órdenes', rows: [ROWS.entered, ROWS.finished] },
  {
    title: 'Producción',
    rows: [
      ROWS.boards,
      ROWS.meters,
      ROWS.banded,
      ROWS.ordersBanded,
      ROWS.ordersAdditional,
      ROWS.work,
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
    title: 'Tiempo de corte',
    rows: [ROWS.work, ROWS.loading, ROWS.sawing, ROWS.paused],
  },
  { title: 'Jornada', rows: [ROWS.start, ROWS.end, ROWS.days] },
  { title: 'Rendimiento', rows: [ROWS.boardsPerHour, ROWS.metersPerHour] },
]
