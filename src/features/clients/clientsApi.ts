import { httpClient } from 'src/shared/api/httpClient'
import type { Client, ClientListParams, ClientPayload } from './types'

const BASE = '/api/v1/clients'

export const clientsApi = {
  list: ({ search, offset = 0, limit = 20 }: ClientListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (search) params.set('search', search)
    return httpClient.list<Client>(`${BASE}/?${params}`)
  },
  create: (data: ClientPayload) => httpClient.post<Client>(`${BASE}/`, data),
  update: (id: string, data: ClientPayload) => httpClient.put<Client>(`${BASE}/${id}`, data),
  remove: (id: string) => httpClient.delete<void>(`${BASE}/${id}`),
}
