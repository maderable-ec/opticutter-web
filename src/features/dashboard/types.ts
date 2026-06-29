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

// --- Cuellos de botella (#1) -------------------------------------------------
// Las 6 etapas del proceso (orden de proceso, no de duración).
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

// Una serie temporal por etapa; `avgHours` es paralelo a `buckets`.
export interface BottleneckSeries {
  key: BottleneckStageKey
  label: string
  avgHours: number[]
}

export interface BottlenecksData {
  stages: BottleneckStage[] // SIEMPRE 6, ya ordenadas por medianHours desc
  buckets: string[] // inicio de cada bucket (ISO)
  series: BottleneckSeries[] // 6 etapas en orden de proceso
}

// --- Productividad por usuario (#2) ------------------------------------------
// Métricas que no aplican al rol quedan en 0 (nunca null). `branchName` es null
// para administrador (sin sucursal).
export interface UserProductivity {
  userId: number
  fullName: string
  role: Role
  branchName: string | null
  // Corte (operador)
  piecesCut: number
  areaCutM2: number
  ordersCut: number
  cuttingHours: number
  piecesPerHour: number
  // Canteado (canteador)
  ordersBanded: number
  bandingHours: number
  // Comercial (vendedor)
  ordersCreated: number
  revenueGenerated: number
}

export interface UsersProductivityData {
  users: UserProductivity[] // ordenado por actividad total desc
}

// --- Asistencia / hora de entrada (#3) ---------------------------------------
// `firstLoginAt` es UTC naive (sin offset) → interpretar como UTC al mostrar.
export interface AttendanceDay {
  date: string // YYYY-MM-DD
  firstLoginAt: string // UTC naive
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
  users: AttendanceUser[] // solo usuarios con login en el rango
}
