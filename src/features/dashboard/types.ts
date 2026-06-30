import type { Role } from 'src/features/auth/types'

export type Granularity = 'day' | 'week' | 'month'

export interface AnalyticsSummary {
  orderCount: number
  realizedRevenue: number
  averageTicket: number
  activeClientsCount: number
  pendingOrdersCount: number
  cancellationRate: number
  totalBoardsConsumed: number
  totalAreaCutM2: number
  wasteEstimateM2: number
  averageEfficiency: number
}

// Time series: `buckets` are ISO date strings; `series` holds parallel numeric
// arrays aligned to the buckets (one value per bucket per metric).
export interface Timeseries {
  buckets: string[]
  series: {
    revenue: number[]
    orderCount: number[]
    boardsConsumed: number[]
    newClients: number[]
  }
}

export interface StatusBreakdownItem {
  key: string
  label: string
  orderCount: number
  revenue: number
}

export interface StatusBreakdownData {
  items: StatusBreakdownItem[]
}

export interface OperationsStats {
  averageEfficiency: number
  totalAreaCutM2: number
  wasteEstimateM2: number
}

// --- Bottlenecks (#1) -------------------------------------------------------
// The 6 process stages (in process order, not by duration).
export type BottleneckStageKey =
  | 'confirm'
  | 'queue_wait'
  | 'cutting'
  | 'finishing'
  | 'dispatch_wait'
  | 'banding'

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
  stages: BottleneckStage[] // always 6, pre-sorted by medianHours desc
  buckets: string[] // start of each bucket (ISO)
  series: BottleneckSeries[] // 6 stages in process order
}

// --- User productivity (#2) --------------------------------------------------
// Metrics that do not apply to a role are 0 (never null). `branchName` is null
// for administrador (no branch).
export interface UserProductivity {
  userId: number
  fullName: string
  role: Role
  branchName: string | null
  // Cutting (operador)
  piecesCut: number
  areaCutM2: number
  ordersCut: number
  cuttingHours: number
  piecesPerHour: number
  // Edge banding (canteador)
  ordersBanded: number
  bandingHours: number
  // Sales (vendedor)
  ordersCreated: number
  revenueGenerated: number
}

export interface UsersProductivityData {
  users: UserProductivity[] // sorted by total activity desc
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
  role: Role
  branchName: string | null
  days: AttendanceDay[]
}

export interface AttendanceData {
  users: AttendanceUser[] // only users with a login in the date range
}
