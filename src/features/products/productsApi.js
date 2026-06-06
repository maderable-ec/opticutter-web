import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/products'

export const productsApi = {
  list: ({ type, search, offset = 0, limit = 20 } = {}) => {
    const params = new URLSearchParams({ offset, limit })
    if (type) params.set('type', type)
    if (search) params.set('search', search)
    return httpClient.list(`${BASE}/?${params}`)
  },
  get: (id) => httpClient.get(`${BASE}/${id}`),
  getByCode: (code) => httpClient.get(`${BASE}/code/${code}`),
  getEdgeBandings: (boardId, bandType) => {
    const params = new URLSearchParams()
    if (bandType) params.set('band_type', bandType)
    const query = params.toString()
    return httpClient.get(`${BASE}/${boardId}/edge-bandings${query ? `?${query}` : ''}`)
  },
  create: (data) => httpClient.post(`${BASE}/`, data),
  update: (id, data) => httpClient.put(`${BASE}/${id}`, data),
  remove: (id) => httpClient.delete(`${BASE}/${id}`),
}
