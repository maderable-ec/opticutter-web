import type { Role } from 'src/features/auth/types'

export type Granularity = 'day' | 'week' | 'month'

// --- Branch comparison (Resumen) ----------------------------------------------
// Every figure is placed in the period by WHEN IT HAPPENED, on Ecuador's days: a sale by its
// payment (entering the queue), a sheet by its last piece cut, a closing by its history row.

// Collected sales. `cash` is money already received — cash AND bank transfer — and `credit` is owed.
export interface SalesFigures {
  cash: number
  credit: number
  total: number
  paidOrders: number
}

export interface OrderFigures {
  entered: number
  finished: number
}

// The shop's work. `boards` weighs a whole board 1, a half 0.5 and a retazo 0; `bandedLinearM` is the
// net tape of every banding closed (no waste factor); `ordersBanded`/`ordersAdditional` count the
// bandings and additional works closed in range. Hours — the saw's only — split each day
// between its first and last cutting event into effective and paused by `idleMinutes`. The averages
// are minutes after local midnight over `daysWorked`; 0 when there is no day.
export interface ProductionFigures {
  boards: number
  cutLinearM: number
  bandedLinearM: number
  ordersBanded: number
  ordersAdditional: number
  effectiveHours: number
  pausedHours: number
  boardsPerHour: number
  metersPerHour: number
  daysWorked: number
  averageStartMinute: number
  averageEndMinute: number
}

export interface BranchFigures {
  branchId: number | null // null on the total
  branchName: string
  sales: SalesFigures
  orders: OrderFigures
  production: ProductionFigures
}

export interface BranchComparison {
  range: { dateFrom: string; dateTo: string }
  idleMinutes: number
  branches: BranchFigures[] // every active branch, zeros included, by id
  total: BranchFigures
}

// --- Production (Producción) ---------------------------------------------------
export interface ProductionDay {
  date: string // YYYY-MM-DD, the business day
  branchId: number
  branchName: string
  firstEventAt: string | null
  lastEventAt: string | null
  effectiveHours: number
  pausedHours: number
  boards: number
  cutLinearM: number
  bandedLinearM: number // bandings closed that day
  ordersBanded: number // bandings closed that day
  ordersAdditional: number // additional works closed that day
  ordersFinished: number
  boardsPerHour: number
  metersPerHour: number
}

export interface ProductionStop {
  branchId: number
  branchName: string
  startedAt: string
  endedAt: string
  minutes: number
}

export interface BranchMaterial {
  branchId: number
  branchName: string
  averageEfficiency: number // 0-100
  areaCutM2: number
  wasteEstimateM2: number
}

export interface ProductionReport {
  range: { dateFrom: string; dateTo: string }
  idleMinutes: number
  days: ProductionDay[] // newest first
  stops: ProductionStop[] // longest first, at most 20
  material: BranchMaterial[]
}

// --- Bottlenecks (#1) -------------------------------------------------------
// The 7 process stages (in process order, not by duration). Four come from the status history;
// the three work stages come from the order's activity rows, which is what made them measurable
// at all -- as columns, only the banding ever was. `finishing` is gone with the `cut` status it
// measured; `process` replaces it as the wall clock of the whole in-process phase (the idle time
// between activities included).
export type BottleneckStageKey =
  | 'confirm'
  | 'queue_wait'
  | 'process'
  | 'cutting'
  | 'banding'
  | 'additional'
  | 'dispatch_wait'

export interface BottleneckStage {
  key: BottleneckStageKey
  label: string
  avgHours: number
  medianHours: number
  p90Hours: number
  sampleCount: number
}

// One timeseries per stage; `avgHours` is parallel to `buckets`.
export interface BottleneckSeries {
  key: BottleneckStageKey
  label: string
  avgHours: number[]
}

export interface BottlenecksData {
  stages: BottleneckStage[] // the 7 stages, pre-sorted by medianHours desc
  buckets: string[] // start of each bucket (ISO)
  series: BottleneckSeries[] // the 7 stages in process order
}

// --- Productivity by role (Productividad) --------------------------------------
// `pendingCount`/`pendingAmount`: the seller's orders confirmed and not paid yet, TODAY — a snapshot,
// not a figure of the period.
export interface SellerFigures {
  paidOrders: number
  cash: number
  credit: number
  total: number
  averageTicket: number
  pendingCount: number
  pendingAmount: number
}

export interface SellerRow extends SellerFigures {
  userId: number | null // null: orders with no quote behind them
  fullName: string
  branchName: string | null
}

export interface SellerReport {
  sellers: SellerRow[]
  total: SellerFigures
}

// The orders behind one seller's row (GET /productivity/sellers/{id}/orders). A sale is dated by its
// payment (`paidAt`, entering the queue), not by the order's creation; `invoice` is the accounting
// system's number, to check the figure there.
export interface SellerOrder {
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  createdAt: string
  paidAt: string
  day: string // YYYY-MM-DD, the business day of the payment
  cash: number
  transfer: number
  credit: number
  total: number // cash + transfer + credit
  invoice: string | null
}

export interface SellerPendingOrder {
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  confirmedAt: string | null
  total: number
}

// `figures` IS the row: it adds up from `paid` and `pending`.
export interface SellerOrdersReport {
  userId: number
  fullName: string
  figures: SellerFigures
  paid: SellerOrder[]
  pending: SellerPendingOrder[]
}

// A sheet is credited to whoever marked its last piece; the hours are the workday rule over the
// operator's own events.
export interface OperatorFigures {
  piecesCut: number
  boards: number
  cutLinearM: number
  effectiveHours: number
  boardsPerHour: number
  metersPerHour: number
  ordersCut: number
}

export interface OperatorRow extends OperatorFigures {
  // null: the work of users deleted since, in one «Sin usuario» row so the total still matches the
  // Resumen.
  userId: number | null
  fullName: string
  branchName: string | null
}

export interface OperatorReport {
  idleMinutes: number
  operators: OperatorRow[]
  total: OperatorFigures
}

// The sheets behind one operator's row (GET /productivity/operators/{id}/boards). A sheet counts
// once every piece is marked, on the day of its last mark, for whoever made that mark.
export type SheetKind = 'whole' | 'half' | 'offcut'
export type SheetCredit = 'credited' | 'credited_to_other' | 'incomplete' | 'outside_range'

export interface OperatorBoard {
  boardId: number
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  sheetNumber: number
  materialName: string | null // null: a retazo or a hand-measured sheet
  width: number
  height: number
  kind: SheetKind
  weight: number // what it adds to `boards` when credited: 1, 0.5 or 0
  day: string // YYYY-MM-DD: of its last mark, or of the operator's last one while incomplete
  piecesTotal: number
  piecesMine: number
  piecesMineInRange: number // they add up to the report's `piecesCut`
  piecesByOthers: number
  piecesPending: number
  otherCutters: string[]
  myLastCutAt: string
  doneAt: string | null
  closedBy: string | null
  status: SheetCredit
}

// `boards` and `piecesCut` are the operator's row, and add up from `sheets`.
export interface OperatorBoardsReport {
  userId: number
  fullName: string
  boards: number
  creditedCount: number
  piecesCut: number
  sheets: OperatorBoard[]
}

// Hours from the activity's start to its close: banding marks no pieces, so its stops are in. The
// metres are the order's NET tape (no waste factor), special edges included. Every closed activity
// counts as work, but only the CLOCKED ones carry time: one started and closed under a minute
// apart was registered after the work (`*Unclocked`), so hours, averages and m/h leave it out.
export interface BanderFigures {
  ordersBanded: number
  ordersBandedUnclocked: number
  bandingHours: number
  bandedLinearM: number
  bandingMetersPerHour: number
  averageBandingHours: number
  ordersAdditional: number
  ordersAdditionalUnclocked: number
  additionalHours: number
  averageAdditionalHours: number
}

export interface BanderRow extends BanderFigures {
  userId: number | null // null: closed by a user deleted since («Sin usuario»)
  fullName: string
  branchName: string | null
}

export interface BanderReport {
  banders: BanderRow[]
  total: BanderFigures
}

// The work behind one bander's row (GET /productivity/banders/{id}/orders), credited to whoever
// closed it. `hours` is null when it was not clocked: started and closed under a minute apart.
export interface BanderOrder {
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  kind: 'banding' | 'additional'
  startedAt: string | null
  finishedAt: string
  day: string // YYYY-MM-DD, the business day of the close
  hours: number | null
  bandedLinearM: number // the order's net tape; 0 for the additional work
}

// `figures` IS the row: it adds up from `orders`.
export interface BanderOrdersReport {
  userId: number
  fullName: string
  figures: BanderFigures
  orders: BanderOrder[]
}

// --- Attendance / check-in time (#3) -----------------------------------------
// `firstLoginAt` is UTC naive (no offset) → treat as UTC when displaying.
export interface AttendanceDay {
  date: string // YYYY-MM-DD
  firstLoginAt: string // UTC naive timestamp
  loginCount: number
}

export interface AttendanceUser {
  userId: number
  fullName: string
  roles: Role[]
  branchName: string | null
  days: AttendanceDay[]
}

export interface AttendanceData {
  users: AttendanceUser[] // only users with a login in the date range
}
