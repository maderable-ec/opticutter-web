import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/orders'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const ordersApi = {
  list: ({ status, skip = 0, limit = 20 } = {}) => {
    const params = new URLSearchParams({ skip, limit })
    if (status) params.set('status', status)
    return httpClient.get(`${BASE}/?${params}`)
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
  list: () => httpClient.get('/api/v1/boards/?limit=100'),
}

export const clientsApiMin = {
  list: (search) => {
    const params = new URLSearchParams({ skip: 0, limit: 50 })
    if (search) params.set('search', search)
    return httpClient.get(`/api/v1/clients/?${params}`)
  },
}
