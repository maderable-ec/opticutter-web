import { httpClient } from 'src/shared/api/httpClient'
import type { OptimizePayload, OptimizeResponse } from './types'

export const optimizerApi = {
  optimize: (data: OptimizePayload) => httpClient.post<OptimizeResponse>('/api/v1/optimize/', data),
}
