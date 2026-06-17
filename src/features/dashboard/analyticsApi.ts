import { httpClient } from 'src/shared/api/httpClient'
import type {
  AnalyticsSummary,
  Granularity,
  OperationsStats,
  StatusBreakdownData,
  Timeseries,
} from './types'

type QsParams = Record<string, string | number | null | undefined>

const buildQs = (params: QsParams) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) qs.set(k, String(v))
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const analyticsApi = {
  summary: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<AnalyticsSummary>(`/api/v1/analytics/summary${buildQs({ from, to, branchId })}`),
  timeseries: (from?: string, to?: string, granularity: Granularity = 'day', branchId?: number) =>
    httpClient.get<Timeseries>(
      `/api/v1/analytics/timeseries${buildQs({ from, to, granularity, branchId })}`,
    ),
  statusBreakdown: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<StatusBreakdownData>(
      `/api/v1/analytics/breakdown/status${buildQs({ from, to, branchId })}`,
    ),
  operations: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<OperationsStats>(
      `/api/v1/analytics/operations${buildQs({ from, to, branchId })}`,
    ),
  // Comparativo por almacén (mismo shape que el breakdown de estados).
  branchBreakdown: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<StatusBreakdownData>(
      `/api/v1/analytics/breakdown/branch${buildQs({ from, to, branchId })}`,
    ),
}
