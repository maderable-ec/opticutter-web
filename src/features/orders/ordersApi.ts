import { httpClient } from 'src/shared/api/httpClient'
import { toQuery } from 'src/shared/api/crudApi'
import { downloadBlob, openInNewTab } from 'src/shared/utils/download'
import type {
  ActivityPayload,
  ActivityResult,
  ActivityType,
  AssociateInvoicePayload,
  Attachment,
  ChangeBranchPayload,
  CuttingPlan,
  MarkPieceResponse,
  Order,
  OrderListParams,
  PiecesExportFormat,
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
    activity,
    activityStatus,
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
        activity,
        activityStatus,
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
  // The shop floor's only write: start/finish one activity. The response carries the order's
  // status, which may have moved by itself (starting the cut takes it out of the queue;
  // closing the last activity finishes it).
  patchActivity: (id: string, activity: ActivityType, data: ActivityPayload) =>
    httpClient.patch<ActivityResult>(`${BASE}/${id}/activities/${activity}`, data),
  // The order's ONLY document: ORDEN DE PEDIDO (with the delivery block the client
  // signs) + the cut diagram + every annex, merged server-side into one PDF. The
  // production and dispatch sheets are gone — their content lives in this one.
  downloadOrderDocument: async (id: string) => {
    openInNewTab(await httpClient.download(`${BASE}/${id}/document?format=pdf`))
  },
  // The cut list as the workshop's commercial cutting program reads it: the inverse of the
  // optimizer's piece import. A file to save, not to view, so it downloads.
  downloadOrderPieces: async (id: string, format: PiecesExportFormat, filename: string) => {
    downloadBlob(
      await httpClient.download(`${BASE}/${id}/pieces/export?format=${format}`),
      filename,
    )
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
