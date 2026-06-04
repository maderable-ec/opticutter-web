import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/clients'

export const clientsApi = {
  list: ({ search, offset = 0, limit = 20 } = {}) => {
    const params = new URLSearchParams({ offset, limit })
    if (search) params.set('search', search)
    return httpClient.list(`${BASE}/?${params}`)
  },
  create: (data) => httpClient.post(`${BASE}/`, data),
  update: (id, data) => httpClient.put(`${BASE}/${id}`, data),
  remove: (id) => httpClient.delete(`${BASE}/${id}`),
}
