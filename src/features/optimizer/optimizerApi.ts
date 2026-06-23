import { httpClient } from 'src/shared/api/httpClient'
import type { OptimizePayload, OptimizeResponse } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const optimizerApi = {
  optimize: (data: OptimizePayload) => httpClient.post<OptimizeResponse>('/api/v1/optimize/', data),
  // La proforma se genera desde el hash de una optimización ya cacheada; requiere clientId.
  downloadOptimizationProforma: (hash: string, clientId: number, priceTierCode?: string) => {
    const params = new URLSearchParams({ clientId: String(clientId), format: 'pdf' })
    if (priceTierCode) params.set('priceTierCode', priceTierCode)
    window.open(`${BASE_URL}/api/v1/optimize/${hash}/proforma?${params}`, '_blank')
  },
}
