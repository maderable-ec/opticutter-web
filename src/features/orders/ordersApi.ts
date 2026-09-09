import { httpClient } from 'src/shared/api/httpClient'
import { toQuery } from 'src/shared/api/crudApi'
import { openInNewTab } from 'src/shared/utils/download'
import type {
  AssociateInvoicePayload,
  Attachment,
  BandingPayload,
  BandingResult,
  ChangeBranchPayload,
  CuttingPlan,
  MarkPieceResponse,
  Order,
  OrderListParams,
  UpdateStatusPayload,
  SetPriorityPayload,
  WorkshopQueueItem,
} from './types'

const BASE = '/api/v1/orders'

export const ordersApi = {
  // `status` may be an array → repeated params (?status=a&status=b); `toQuery` handles that.
  // Every param must be named in this destructure or `toQuery` never sees it.
  list: ({
    status,
    branchId,
    clientId,
    search,
    createdFrom,
    createdTo,
    sort,
    isPriority,
    bandingStatus,
    offset = 0,
    limit = 20,
  }: OrderListParams = {}) =>
    httpClient.list<Order>(
      `${BASE}/?${toQuery({
        status,
        branchId,
        clientId,
        search,
        createdFrom,
        createdTo,
        sort,
        isPriority,
        bandingStatus,
        offset,
        limit,
      })}`,
    ),
  get: (id: string) => httpClient.get<Order>(`${BASE}/${id}`),
  updateStatus: (id: string, data: UpdateStatusPayload) =>
    httpClient.patch<Order>(`${BASE}/${id}/status`, data),
  changeBranch: (id: string, data: ChangeBranchPayload) =>
    httpClient.patch<Order>(`${BASE}/${id}/branch`, data),
  setPriority: (id: string, data: SetPriorityPayload) =>
    httpClient.patch<Order>(`${BASE}/${id}/priority`, data),
  associateInvoice: (id: string, data: AssociateInvoicePayload) =>
    httpClient.post<Order>(`${BASE}/${id}/invoice`, data),
  getCuttingPlan: (id: string) => httpClient.get<CuttingPlan>(`${BASE}/${id}/cutting-plan`),
  markPiece: (id: string, pieceId: number, cut: boolean) =>
    httpClient.patch<MarkPieceResponse>(`${BASE}/${id}/cutting-plan/pieces/${pieceId}`, { cut }),
  // Workshop board: response is `{ data: [...], meta: {} }` with no pagination → use `get`, not `list`.
  getWorkshopQueue: () => httpClient.get<WorkshopQueueItem[]>(`${BASE}/workshop-queue`),
  patchBanding: (id: string, data: BandingPayload) =>
    httpClient.patch<BandingResult>(`${BASE}/${id}/banding`, data),
  // The order's ONLY document: ORDEN DE PEDIDO (with the delivery block the client
  // signs) + the cut diagram + every annex, merged server-side into one PDF. The
  // production and dispatch sheets are gone — their content lives in this one.
  downloadOrderDocument: async (id: string) => {
    openInNewTab(await httpClient.download(`${BASE}/${id}/document?format=pdf`))
  },
  // Attachments: response is `{ data: Attachment[] }` with no pagination → use `get`, not `list`.
  listAttachments: (id: string) => httpClient.get<Attachment[]>(`${BASE}/${id}/attachments`),
  uploadAttachment: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return httpClient.upload<Attachment>(`${BASE}/${id}/attachments`, form)
  },
  deleteAttachment: (id: string, attachmentId: number) =>
    httpClient.delete<null>(`${BASE}/${id}/attachments/${attachmentId}`),
  // Opens the attachment inline in a new tab.
  downloadAttachment: async (id: string, attachmentId: number) => {
    openInNewTab(await httpClient.download(`${BASE}/${id}/attachments/${attachmentId}`))
  },
}
