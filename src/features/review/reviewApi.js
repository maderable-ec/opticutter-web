import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/public/review'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const reviewApi = {
  get: (token) => httpClient.get(`${BASE}/${token}`),
  confirm: (token, note) => httpClient.post(`${BASE}/${token}/confirm`, note ? { note } : {}),
  reject: (token, note) => httpClient.post(`${BASE}/${token}/reject`, note ? { note } : {}),
  downloadProforma: (token) => {
    window.open(`${BASE_URL}${BASE}/${token}/proforma?format=pdf`, '_blank')
  },
}
