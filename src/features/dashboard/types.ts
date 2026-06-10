export type Granularity = 'day' | 'week' | 'month'

export interface AnalyticsSummary {
  orderCount: number
  realizedRevenue: number
  averageTicket: number
  activeClientsCount: number
  pendingOrdersCount: number
  cancellationRate: number
  expiryRate: number
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

// One status→status transition in the order lifecycle, with timing stats.
export interface LifecycleTransition {
  fromStatus: string
  toStatus: string
  avgHours: number
  sampleCount: number
}

export interface OperationsStats {
  averageEfficiency: number
  expiryBeforeApprovalRate: number
  totalAreaCutM2: number
  wasteEstimateM2: number
  lifecycle: LifecycleTransition[]
}
