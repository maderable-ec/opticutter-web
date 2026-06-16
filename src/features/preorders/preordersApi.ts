import { httpClient } from 'src/shared/api/httpClient'
import type {
  PreOrder,
  PreOrderCreate,
  PreOrderListParams,
  PreOrderSummary,
  ReviewLink,
  ReviewLinkInfo,
} from './types'

const BASE = '/api/v1/preorders'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const preordersApi = {
  list: ({ status, clientId, offset = 0, limit = 20 }: PreOrderListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (status) params.set('status', status)
    if (clientId) params.set('clientId', String(clientId))
    return httpClient.list<PreOrderSummary>(`${BASE}/?${params}`)
  },
  get: (id: number) => httpClient.get<PreOrder>(`${BASE}/${id}`),
  create: (data: PreOrderCreate) => httpClient.post<PreOrder>(`${BASE}/`, data),
  update: (id: number, data: Partial<PreOrderCreate>) =>
    httpClient.put<PreOrder>(`${BASE}/${id}`, data),
  remove: (id: number) => httpClient.delete<null>(`${BASE}/${id}`),
  createReviewLink: (id: number) => httpClient.post<ReviewLink>(`${BASE}/${id}/review-link`),
  getReviewLinkInfo: (id: number) => httpClient.get<ReviewLinkInfo>(`${BASE}/${id}/review-link`),
  downloadProforma: (id: number) => {
    window.open(`${BASE_URL}${BASE}/${id}/proforma?format=pdf`, '_blank')
  },
}
