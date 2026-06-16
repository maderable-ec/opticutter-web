import { httpClient } from 'src/shared/api/httpClient'
import type { ReviewPreOrder } from './types'

const BASE = '/api/v1/public/review'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const reviewApi = {
  get: (token: string) => httpClient.get<ReviewPreOrder>(`${BASE}/${token}`),
  confirm: (token: string, note?: string) =>
    httpClient.post<ReviewPreOrder>(`${BASE}/${token}/confirm`, note ? { note } : {}),
  reject: (token: string, note?: string) =>
    httpClient.post<ReviewPreOrder>(`${BASE}/${token}/reject`, note ? { note } : {}),
  requestChanges: (token: string, note?: string) =>
    httpClient.post<ReviewPreOrder>(`${BASE}/${token}/request-changes`, note ? { note } : {}),
  downloadProforma: (token: string) => {
    window.open(`${BASE_URL}${BASE}/${token}/proforma?format=pdf`, '_blank')
  },
}
