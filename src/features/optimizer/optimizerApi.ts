import { httpClient } from 'src/shared/api/httpClient'
import type {
  LayoutCandidatesPayload,
  LayoutCandidatesResponse,
  LayoutEvaluateResponse,
  OptimizePayload,
  OptimizeResponse,
} from './types'

export const optimizerApi = {
  optimize: (data: OptimizePayload) => httpClient.post<OptimizeResponse>('/api/v1/optimize/', data),
  // The layout editor: the plan with its working adjustment, and where a piece may go. Neither
  // caches nor writes anything; the server stays the only judge of what can be cut.
  evaluateLayout: (data: OptimizePayload) =>
    httpClient.post<LayoutEvaluateResponse>('/api/v1/optimize/layout/evaluate', data),
  layoutCandidates: (data: LayoutCandidatesPayload) =>
    httpClient.post<LayoutCandidatesResponse>('/api/v1/optimize/layout/candidates', data),
}
