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
// net tape of every banding closed (no waste factor). Hours — the saw's only — split each day
// between its first and last cutting event into effective and paused by `idleMinutes`. The averages
// are minutes after local midnight over `daysWorked`; 0 when there is no day.
export interface ProductionFigures {
  boards: number
  cutLinearM: number
  bandedLinearM: number
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
  userId: number
  fullName: string
  branchName: string | null
}

export interface OperatorReport {
  idleMinutes: number
  operators: OperatorRow[]
  total: OperatorFigures
}

// Hours from the activity's start to its close: banding marks no pieces, so its stops are in. The
// metres are the order's NET tape (no waste factor), special edges included.
export interface BanderFigures {
  ordersBanded: number
  bandingHours: number
  bandedLinearM: number
  bandingMetersPerHour: number
  averageBandingHours: number
  ordersAdditional: number
  additionalHours: number
  averageAdditionalHours: number
}

export interface BanderRow extends BanderFigures {
  userId: number
  fullName: string
  branchName: string | null
}

export interface BanderReport {
  banders: BanderRow[]
  total: BanderFigures
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
