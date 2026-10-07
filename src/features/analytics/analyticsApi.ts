import { httpClient } from 'src/shared/api/httpClient'
import type { Role } from 'src/features/auth/types'
import type {
  AttendanceData,
  BanderOrdersReport,
  BanderReport,
  BottlenecksData,
  BranchComparison,
  Granularity,
  OperatorBoardsReport,
  OperatorReport,
  ProductionReport,
  SellerOrdersReport,
  SellerReport,
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

const BASE = '/api/v1/analytics'

export const analyticsApi = {
  // Every branch against every other, plus the total: always all of them, so no `branchId`.
  branchComparison: (from?: string, to?: string) =>
    httpClient.get<BranchComparison>(`${BASE}/branch-comparison${buildQs({ from, to })}`),
  production: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<ProductionReport>(`${BASE}/production${buildQs({ from, to, branchId })}`),
  bottlenecks: (from?: string, to?: string, branchId?: number, granularity: Granularity = 'day') =>
    httpClient.get<BottlenecksData>(
      `${BASE}/bottlenecks${buildQs({ from, to, branchId, granularity })}`,
    ),
  sellers: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<SellerReport>(`${BASE}/productivity/sellers${buildQs({ from, to, branchId })}`),
  // What is behind one person's row, to check it against what they say: a seller's orders, an
  // operator's sheets, a bander's work.
  sellerOrders: (userId: number, from?: string, to?: string, branchId?: number) =>
    httpClient.get<SellerOrdersReport>(
      `${BASE}/productivity/sellers/${userId}/orders${buildQs({ from, to, branchId })}`,
    ),
  operators: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<OperatorReport>(
      `${BASE}/productivity/operators${buildQs({ from, to, branchId })}`,
    ),
  operatorBoards: (userId: number, from?: string, to?: string, branchId?: number) =>
    httpClient.get<OperatorBoardsReport>(
      `${BASE}/productivity/operators/${userId}/boards${buildQs({ from, to, branchId })}`,
    ),
  banders: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<BanderReport>(`${BASE}/productivity/banders${buildQs({ from, to, branchId })}`),
  banderOrders: (userId: number, from?: string, to?: string, branchId?: number) =>
    httpClient.get<BanderOrdersReport>(
      `${BASE}/productivity/banders/${userId}/orders${buildQs({ from, to, branchId })}`,
    ),
  attendance: (from?: string, to?: string, branchId?: number, role?: Role) =>
    httpClient.get<AttendanceData>(`${BASE}/attendance${buildQs({ from, to, branchId, role })}`),
}
