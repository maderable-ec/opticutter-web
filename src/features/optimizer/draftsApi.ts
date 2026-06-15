import { httpClient } from 'src/shared/api/httpClient'
import type { Draft, DraftSummary, OptimizerDraftPayload } from './types'

const PATH = '/api/v1/optimization-drafts'

interface DraftWrite {
  name: string
  clientId?: number | null
  payload: OptimizerDraftPayload
}

// CRUD del recurso de borradores. Sigue el patrón de `optimizerApi.ts`/`ordersApi.ts`: el
// httpClient ya desenvuelve `data` y `list()` devuelve `{ items, pagination }`.
export const draftsApi = {
  list: () => httpClient.list<DraftSummary>(`${PATH}/`),
  get: (id: number) => httpClient.get<Draft>(`${PATH}/${id}`),
  create: (data: DraftWrite) => httpClient.post<Draft>(`${PATH}/`, data),
  update: (id: number, data: Partial<DraftWrite>) => httpClient.put<Draft>(`${PATH}/${id}`, data),
  remove: (id: number) => httpClient.delete<null>(`${PATH}/${id}`),
}
