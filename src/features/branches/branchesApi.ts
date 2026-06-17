import { httpClient } from 'src/shared/api/httpClient'
import type { Branch, BranchListParams, BranchPayload, BranchUpdatePayload } from './types'

const BASE = '/api/v1/branches'

export const branchesApi = {
  list: ({ search, offset = 0, limit = 20 }: BranchListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (search) params.set('search', search)
    return httpClient.list<Branch>(`${BASE}/?${params}`)
  },
  get: (id: number) => httpClient.get<Branch>(`${BASE}/${id}`),
  create: (data: BranchPayload) => httpClient.post<Branch>(`${BASE}/`, data),
  update: (id: number, data: BranchUpdatePayload) => httpClient.put<Branch>(`${BASE}/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`${BASE}/${id}`),
}
