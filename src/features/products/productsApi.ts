import { httpClient } from 'src/shared/api/httpClient'
import type { EdgeBandingProduct, Product, ProductListParams, ProductPayload } from './types'

const BASE = '/api/v1/products'

export const productsApi = {
  list: ({ type, search, offset = 0, limit = 20 }: ProductListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (type) params.set('type', type)
    if (search) params.set('search', search)
    return httpClient.list<Product>(`${BASE}/?${params}`)
  },
  get: (id: string) => httpClient.get<Product>(`${BASE}/${id}`),
  getByCode: (code: string) => httpClient.get<Product>(`${BASE}/code/${code}`),
  getEdgeBandings: (boardId: string, bandType?: string) => {
    const params = new URLSearchParams()
    if (bandType) params.set('band_type', bandType)
    const query = params.toString()
    return httpClient.get<EdgeBandingProduct[]>(
      `${BASE}/${boardId}/edge-bandings${query ? `?${query}` : ''}`,
    )
  },
  create: (data: ProductPayload) => httpClient.post<Product>(`${BASE}/`, data),
  update: (id: string, data: ProductPayload) => httpClient.put<Product>(`${BASE}/${id}`, data),
  remove: (id: string) => httpClient.delete<void>(`${BASE}/${id}`),
}
