import { httpClient } from 'src/shared/api/httpClient'
import type { Draft, DraftSummary, OptimizerDraftPayload } from './types'

const PATH = '/api/v1/optimization-drafts'

interface DraftWrite {
  name: string
  clientId?: number | null
  payload: OptimizerDraftPayload
  // Only sent by admin on creation; non-admin staff omit it (backend enforces their branch).
  branchId?: number | null
}

// CRUD for the drafts resource. Follows the pattern of `optimizerApi.ts`/`ordersApi.ts`:
// httpClient unwraps `data` and `list()` returns `{ items, pagination }`.
export const draftsApi = {
  // `branchId` is only passed by admin; non-admin staff are scoped to their branch by the backend.
  list: (branchId?: number) => {
    const params = new URLSearchParams()
    if (branchId) params.set('branchId', String(branchId))
    const qs = params.toString()
    return httpClient.list<DraftSummary>(`${PATH}/${qs ? `?${qs}` : ''}`)
  },
  get: (id: number) => httpClient.get<Draft>(`${PATH}/${id}`),
  create: (data: DraftWrite) => httpClient.post<Draft>(`${PATH}/`, data),
  update: (id: number, data: Partial<DraftWrite>) => httpClient.put<Draft>(`${PATH}/${id}`, data),
  remove: (id: number) => httpClient.delete<null>(`${PATH}/${id}`),
}
