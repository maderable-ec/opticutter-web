import { httpClient } from 'src/shared/api/httpClient'
import type {
  AnalyticsSummary,
  Granularity,
  OperationsStats,
  StatusBreakdownItem,
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
  summary: (from?: string, to?: string) =>
    httpClient.get<AnalyticsSummary>(`/api/v1/analytics/summary${buildQs({ from, to })}`),
  timeseries: (from?: string, to?: string, granularity: Granularity = 'day') =>
    httpClient.get<Timeseries>(`/api/v1/analytics/timeseries${buildQs({ from, to, granularity })}`),
  statusBreakdown: (from?: string, to?: string) =>
    httpClient.get<StatusBreakdownItem[]>(
      `/api/v1/analytics/breakdown/status${buildQs({ from, to })}`,
    ),
  operations: (from?: string, to?: string) =>
    httpClient.get<OperationsStats>(`/api/v1/analytics/operations${buildQs({ from, to })}`),
}
