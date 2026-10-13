import { httpClient } from 'src/shared/api/httpClient'
import type { BranchConsumables, ConsumableReport, RegisterChangePayload } from './types'

const BASE = '/api/v1/consumables'

// `?a=1&b=2` of the params that have a value, or nothing.
const qs = (params: Record<string, string | number | undefined>): string => {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') sp.set(key, String(value))
  }
  const query = sp.toString()
  return query ? `?${query}` : ''
}

export const consumablesApi = {
  // What is on each machine. The shop floor gets its own branch whatever it asks for; a global
  // role gets every active one, or the one in `branchId`.
  status: (branchId?: number) =>
    httpClient.get<BranchConsumables[]>(`${BASE}/status${qs({ branchId })}`),
  // Both writes answer with the branch as it now stands.
  register: (data: RegisterChangePayload) =>
    httpClient.post<BranchConsumables>(`${BASE}/changes`, data),
  // Taking one's own change back asks nothing; the admin voiding any other says why.
  void: (changeId: number, reason?: string) =>
    httpClient.post<BranchConsumables>(`${BASE}/changes/${changeId}/void`, { reason }),
  // The yield over a period is a statistic, served with the rest of them.
  report: (from?: string, to?: string, branchId?: number) =>
    httpClient.get<ConsumableReport>(`/api/v1/analytics/consumables${qs({ from, to, branchId })}`),
}
