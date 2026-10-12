import type { Role } from 'src/features/auth/types'
import type { ActivityType, PauseReason, PaymentMethod } from 'src/features/orders/types'

export type Granularity = 'day' | 'week' | 'month'

// --- Branch comparison (Resumen) ----------------------------------------------
// Every figure is placed in the period by WHEN IT HAPPENED, on Ecuador's days: a sale by its
// payment (entering the queue), a sheet by its last piece cut, a closing by its history row.

// The sales of the range as they were SOLD: `cash` is what came in on the spot — cash AND bank
// transfer — and `credit` what was sold on credit; the two add up to `total`.
//
// `creditCollected` is the credit paid back IN the range, whenever its order was sold: dated by
// when the money came in, like everything here. `creditOutstanding` is not a figure of the period:
// it is what clients owe RIGHT NOW over every order, and it comes down with each payment.
export interface SalesFigures {
  cash: number
  credit: number
  total: number
  paidOrders: number
  creditCollected: number
  creditOutstanding: number
  creditOutstandingOrders: number
}

export interface OrderFigures {
  entered: number
  finished: number
}

// The shop's work. `boards` weighs a whole board 1, a half 0.5 and a retazo 0; `bandedLinearM` is the
// net tape of every banding closed (no waste factor); `ordersBanded`/`ordersAdditional` count the
// bandings and additional works closed in range.
//
// The cut's time — the saw's only — runs from taking an order to its last piece: `loadingHours` up
// to the first piece (pulling the sheets and loading the saw), `sawingHours` from there on, and
// `workHours` their sum, which is what the rates divide by. A registered pause is out, and so is the
// time off the work ran across (the night, the lunch hour); `pausedHours` is the working time the
// cut spent in a registered pause. The averages are minutes after local midnight over `daysWorked`;
// 0 when there is no day.
export interface ProductionFigures {
  boards: number
  cutLinearM: number
  bandedLinearM: number
  ordersBanded: number
  ordersAdditional: number
  workHours: number
  loadingHours: number
  sawingHours: number
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
  workHours: number // loading + sawing: the cut's time that day
  loadingHours: number
  sawingHours: number
  pausedHours: number // working time in a registered pause of the cut
  boards: number
  cutLinearM: number
  bandedLinearM: number // bandings closed that day
  ordersBanded: number // bandings closed that day
  ordersAdditional: number // additional works closed that day
  ordersFinished: number
  boardsPerHour: number
  metersPerHour: number
}

// One registered pause that overlaps the range, of any activity. `hours` is the working time it
// took — a pause from 16:00 to 10:00 the next morning stopped the work four hours — up to now when
// it is still in force (`endedAt` null).
export interface ProductionPause {
  id: number
  branchId: number
  branchName: string
  orderId: number
  orderCode: string | null
  clientName: string
  activity: ActivityType
  reason: PauseReason
  note: string | null
  startedAt: string
  startedBy: string | null
  endedAt: string | null
  endedBy: string | null
  hours: number
}

export interface PauseTotal {
  reason: PauseReason
  count: number
  hours: number
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
  pauses: ProductionPause[] // newest first
  pauseTotals: PauseTotal[] // by reason, the one that took longest first
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
// not a figure of the period. `creditCollected` is the credit paid back in the range on their orders,
// whenever they were sold; `creditOutstanding`, what their clients owe today (a snapshot too).
export interface SellerFigures {
  paidOrders: number
  cash: number
  credit: number
  total: number
  averageTicket: number
  pendingCount: number
  pendingAmount: number
  creditCollected: number
  creditOutstanding: number
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
  // Of that credit, what the client has paid since (to date) and still owes.
  creditCollected: number
  creditBalance: number
}

// A payment received in range on one of the seller's orders, dated by when the money came in:
// credit sold in September and paid in October is October's money.
export interface SellerCollection {
  paymentId: number
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  soldAt: string | null
  paidAt: string
  day: string // YYYY-MM-DD, the business day the money came in
  method: PaymentMethod
  amount: number
  receivedBy: string | null
  note: string | null
}

// An order of the seller the client still owes on, today.
export interface SellerOutstandingOrder {
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  soldAt: string | null
  credit: number
  creditCollected: number
  creditBalance: number
}

export interface SellerPendingOrder {
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  confirmedAt: string | null
  total: number
}

// `figures` IS the row: it adds up from `paid`, `pending`, `collections` and `outstanding`.
export interface SellerOrdersReport {
  userId: number
  fullName: string
  figures: SellerFigures
  paid: SellerOrder[]
  pending: SellerPendingOrder[]
  collections: SellerCollection[] // newest payment first
  outstanding: SellerOutstandingOrder[] // oldest sale first
}

// A sheet is credited to whoever marked its last piece, and a stretch of the cut's time to whoever
// closed it (the mark, or the pause, at its end). The hours split like the branch's: loading, sawing
// and their sum. `pausedHours`/`pauses`: the pauses they registered on the cut.
export interface OperatorFigures {
  piecesCut: number
  boards: number
  cutLinearM: number
  workHours: number
  loadingHours: number
  sawingHours: number
  pausedHours: number
  pauses: number
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

// The time one operator put into one order's cut, in range: `loadingHours` up to the order's first
// piece, `sawingHours` after it, where THEY closed the stretch. `pausedHours` is the working time
// the order's cut spent in a registered pause, whoever registered it.
export interface OperatorOrderTime {
  orderId: number
  orderCode: string | null
  clientName: string
  branchName: string
  takenAt: string | null // null: cut before the activities had clocks
  firstPieceAt: string
  lastPieceAt: string
  loadingHours: number
  sawingHours: number
  workHours: number
  pausedHours: number
  pauseReasons: PauseReason[]
}

// `boards` and `piecesCut` are the operator's row, and add up from `sheets`. `orders` does the same
// for the hours — except where two orders were open at once, which the row counts a single time.
export interface OperatorBoardsReport {
  userId: number
  fullName: string
  boards: number
  creditedCount: number
  piecesCut: number
  sheets: OperatorBoard[]
  orders: OperatorOrderTime[] // newest last piece first
}

// Hours from the activity's start to its close, less its registered pauses and the time off it ran
// across (the night, the lunch hour); `pausedHours` is the working time those pauses took. The
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
  pausedHours: number
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
  pausedHours: number // working time in its registered pauses
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
