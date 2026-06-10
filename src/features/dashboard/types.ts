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

export interface TimeseriesBucket {
  date: string
  revenue?: number
  orderCount?: number
  [key: string]: unknown
}

export interface Timeseries {
  series?: TimeseriesBucket[]
  buckets?: TimeseriesBucket[]
}

export interface StatusBreakdownItem {
  status: string
  count: number
}

export interface OperationsStats {
  totalAreaCutM2: number
  averageEfficiency: number
  wasteEstimateM2: number
  expiryBeforeApprovalRate: number
}
