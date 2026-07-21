import { httpClient } from 'src/shared/api/httpClient'
import { toQuery } from 'src/shared/api/crudApi'

const BASE = '/api/v1/print'

// Response of the enqueue endpoints (202): the created PrintJob's id and initial status.
export interface PrintJobCreated {
  jobId: number
  status: string
}

export type PrintJobStatus = 'pending' | 'sent' | 'done' | 'error' | 'expired'
export type PrintJobType = 'label' | 'sheet'

// A print job as shown in the shop-floor panel: its real status plus enough order
// context to render the row and re-dispatch it (`orderId`, and `placedPieceId` for labels).
export interface PrintJobListItem {
  id: number
  orderId: number
  orderCode: string | null
  clientName: string | null
  jobType: PrintJobType
  placedPieceId: number | null
  status: PrintJobStatus
  attempts: number
  errorMessage: string | null
  createdAt: string
  doneAt: string | null
}

export interface PrintJobsParams {
  status?: string // CSV of statuses, e.g. 'pending,sent,error,expired'
  limit?: number
}

// Fire-and-forget print dispatch. The backend renders the payload (thermal label as TSPL, or the
// consolidated PDF packet) and enqueues a PrintJob for the branch's local agent to pick up and
// print silently. `listJobs`/`retry` back the shop-floor panel that surfaces failed prints.
export const printApi = {
  label: (orderId: string, pieceId: number) =>
    httpClient.post<PrintJobCreated>(`${BASE}/label`, { orderId, pieceId }),
  consolidated: (orderId: string) =>
    httpClient.post<PrintJobCreated>(`${BASE}/consolidated`, { orderId }),
  listJobs: (params?: PrintJobsParams) =>
    httpClient.get<PrintJobListItem[]>(`${BASE}/jobs?${toQuery(params ?? {})}`),
  retry: (jobId: number) => httpClient.post<PrintJobCreated>(`${BASE}/jobs/${jobId}/retry`),
}
