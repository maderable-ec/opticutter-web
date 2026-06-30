import { httpClient } from 'src/shared/api/httpClient'
import type { Role } from 'src/features/auth/types'
import type {
  AnalyticsSummary,
  AttendanceData,
  BottlenecksData,
  Granularity,
  OperationsStats,
  StatusBreakdownData,
  Timeseries,
  UsersProductivityData,
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
  // Per-branch comparison (same shape as the status breakdown).
  branchBreakdown: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<StatusBreakdownData>(
      `/api/v1/analytics/breakdown/branch${buildQs({ from, to, branchId })}`,
    ),
  // Bottlenecks (#1): stages (median/p90) + per-stage timeseries.
  bottlenecks: (from?: string, to?: string, branchId?: number, granularity: Granularity = 'day') =>
    httpClient.get<BottlenecksData>(
      `/api/v1/analytics/bottlenecks${buildQs({ from, to, branchId, granularity })}`,
    ),
  // User productivity (#2).
  users: (from?: string, to?: string, branchId?: number, role?: Role) =>
    httpClient.get<UsersProductivityData>(
      `/api/v1/analytics/users${buildQs({ from, to, branchId, role })}`,
    ),
  // Attendance / check-in time (#3).
  attendance: (from?: string, to?: string, branchId?: number, role?: Role) =>
    httpClient.get<AttendanceData>(
      `/api/v1/analytics/attendance${buildQs({ from, to, branchId, role })}`,
    ),
}
