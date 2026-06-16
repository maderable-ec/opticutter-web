import { httpClient } from 'src/shared/api/httpClient'
import type { Client } from 'src/features/clients/types'
import type {
  AssociateInvoicePayload,
  CuttingPlan,
  MarkPieceResponse,
  Order,
  OrderListParams,
  UpdateStatusPayload,
} from './types'

const BASE = '/api/v1/orders'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const ordersApi = {
  list: ({ status, offset = 0, limit = 20 }: OrderListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (status) params.set('status', status)
    return httpClient.list<Order>(`${BASE}/?${params}`)
  },
  get: (id: string) => httpClient.get<Order>(`${BASE}/${id}`),
  updateStatus: (id: string, data: UpdateStatusPayload) =>
    httpClient.patch<Order>(`${BASE}/${id}/status`, data),
  associateInvoice: (id: string, data: AssociateInvoicePayload) =>
    httpClient.post<Order>(`${BASE}/${id}/invoice`, data),
  getCuttingPlan: (id: string) => httpClient.get<CuttingPlan>(`${BASE}/${id}/cutting-plan`),
  markPiece: (id: string, pieceId: number, cut: boolean) =>
    httpClient.patch<MarkPieceResponse>(`${BASE}/${id}/cutting-plan/pieces/${pieceId}`, { cut }),
  downloadProforma: (id: string) => {
    window.open(`${BASE_URL}${BASE}/${id}/proforma?format=pdf`, '_blank')
  },
  downloadProductionSheet: (id: string) => {
    window.open(`${BASE_URL}${BASE}/${id}/production-sheet?format=pdf`, '_blank')
  },
}

export const clientsApiMin = {
  list: (search?: string) => {
    const params = new URLSearchParams({ offset: '0', limit: '50' })
    if (search) params.set('search', search)
    return httpClient.list<Client>(`/api/v1/clients/?${params}`)
  },
}
