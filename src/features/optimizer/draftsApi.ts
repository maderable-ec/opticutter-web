import { httpClient } from 'src/shared/api/httpClient'
import type { Draft, DraftSummary, OptimizerDraftPayload } from './types'

const PATH = '/api/v1/optimization-drafts'

interface DraftWrite {
  name: string
  clientId?: number | null
  payload: OptimizerDraftPayload
  // Sólo lo envía el admin al crear; el staff lo omite (el backend fuerza su sucursal).
  branchId?: number | null
}

// CRUD del recurso de borradores. Sigue el patrón de `optimizerApi.ts`/`ordersApi.ts`: el
// httpClient ya desenvuelve `data` y `list()` devuelve `{ items, pagination }`.
export const draftsApi = {
  // `branchId` sólo lo pasa el admin; el staff queda acotado a su sucursal por el backend.
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
