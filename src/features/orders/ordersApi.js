import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/orders'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const ordersApi = {
  list: ({ status, offset = 0, limit = 20 } = {}) => {
    const params = new URLSearchParams({ offset, limit })
    if (status) params.set('status', status)
    return httpClient.list(`${BASE}/?${params}`)
  },
  get: (id) => httpClient.get(`${BASE}/${id}`),
  create: (data) => httpClient.post(`${BASE}/`, data),
  updateStatus: (id, data) => httpClient.patch(`${BASE}/${id}/status`, data),
  associateInvoice: (id, data) => httpClient.post(`${BASE}/${id}/invoice`, data),
  downloadProforma: (id) => {
    window.open(`${BASE_URL}${BASE}/${id}/proforma?format=pdf`, '_blank')
  },
  downloadProductionSheet: (id) => {
    window.open(`${BASE_URL}${BASE}/${id}/production-sheet?format=pdf`, '_blank')
  },
}

export const boardsApi = {
  list: () => httpClient.list('/api/v1/boards/?limit=100'),
}

export const clientsApiMin = {
  list: (search) => {
    const params = new URLSearchParams({ offset: 0, limit: 50 })
    if (search) params.set('search', search)
    return httpClient.list(`/api/v1/clients/?${params}`)
  },
}
