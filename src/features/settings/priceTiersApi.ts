import { httpClient } from 'src/shared/api/httpClient'
import type { PriceTier, PriceTiersPayload } from './types'

const BASE = '/api/v1/settings'

export const priceTiersApi = {
  getAll: () => httpClient.get<PriceTier[]>(`${BASE}/price-tiers`),
  update: (data: PriceTiersPayload) =>
    httpClient.patch<PriceTier[]>(`${BASE}/price-tiers`, data),
}
