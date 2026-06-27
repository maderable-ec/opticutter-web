import { httpClient } from 'src/shared/api/httpClient'
import type { Client } from 'src/features/clients/types'
import type {
  AssociateInvoicePayload,
  BandingPayload,
  BandingQueueItem,
  BandingResult,
  CuttingPlan,
  MarkPieceResponse,
  Order,
  OrderListParams,
  UpdateStatusPayload,
} from './types'

const BASE = '/api/v1/orders'

export const ordersApi = {
  list: ({ status, branchId, offset = 0, limit = 20 }: OrderListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    // Varios estados → `status` repetido (?status=a&status=b); uno solo → un único `status`.
    if (Array.isArray(status)) status.forEach((s) => params.append('status', s))
    else if (status) params.set('status', status)
    if (branchId) params.set('branchId', String(branchId))
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
  // Canteado: la cola devuelve `{ data: [...], meta: {} }` (sin paginación) → `get`, no `list`.
  getBandingQueue: () => httpClient.get<BandingQueueItem[]>(`${BASE}/banding-queue`),
  patchBanding: (id: string, data: BandingPayload) =>
    httpClient.patch<BandingResult>(`${BASE}/${id}/banding`, data),
  downloadOrderDocument: async (id: string) => {
    const blob = await httpClient.download(`${BASE}/${id}/document?format=pdf`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
  downloadProductionSheet: async (id: string) => {
    const blob = await httpClient.download(`${BASE}/${id}/production-sheet?format=pdf`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
  downloadDispatchSheet: async (id: string) => {
    const blob = await httpClient.download(`${BASE}/${id}/dispatch-sheet?format=pdf`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
}

export const clientsApiMin = {
  list: (search?: string) => {
    const params = new URLSearchParams({ offset: '0', limit: '50' })
    if (search) params.set('search', search)
    return httpClient.list<Client>(`/api/v1/clients/?${params}`)
  },
}
