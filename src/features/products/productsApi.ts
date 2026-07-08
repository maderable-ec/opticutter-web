import { httpClient } from 'src/shared/api/httpClient'
import { createCrudApi } from 'src/shared/api/crudApi'
import type { EdgeBandingProduct, Product, ProductListParams, ProductPayload } from './types'

const BASE = '/api/v1/products'

export const productsApi = {
  ...createCrudApi<Product, ProductListParams, ProductPayload, ProductPayload, string>(BASE),
  getByCode: (code: string) => httpClient.get<Product>(`${BASE}/code/${code}`),
  getEdgeBandings: (boardId: string, bandType?: string) => {
    const params = new URLSearchParams()
    if (bandType) params.set('band_type', bandType)
    const query = params.toString()
    return httpClient.get<EdgeBandingProduct[]>(
      `${BASE}/${boardId}/edge-bandings${query ? `?${query}` : ''}`,
    )
  },
}
