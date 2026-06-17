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

export const preordersApi = {
  list: ({ status, clientId, branchId, offset = 0, limit = 20 }: PreOrderListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (status) params.set('status', status)
    if (clientId) params.set('clientId', String(clientId))
    if (branchId) params.set('branchId', String(branchId))
    return httpClient.list<PreOrderSummary>(`${BASE}/?${params}`)
  },
  get: (id: number) => httpClient.get<PreOrder>(`${BASE}/${id}`),
  create: (data: PreOrderCreate) => httpClient.post<PreOrder>(`${BASE}/`, data),
  update: (id: number, data: Partial<PreOrderCreate>) =>
    httpClient.put<PreOrder>(`${BASE}/${id}`, data),
  remove: (id: number) => httpClient.delete<null>(`${BASE}/${id}`),
  createReviewLink: (id: number) => httpClient.post<ReviewLink>(`${BASE}/${id}/review-link`),
  getReviewLinkInfo: (id: number) => httpClient.get<ReviewLinkInfo>(`${BASE}/${id}/review-link`),
  downloadProforma: async (id: number) => {
    const blob = await httpClient.download(`${BASE}/${id}/proforma?format=pdf`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
}
