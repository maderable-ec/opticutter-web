import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/print'

// Response of the enqueue endpoints (202): the created PrintJob's id and initial status.
export interface PrintJobCreated {
  jobId: number
  status: string
}

// Fire-and-forget print dispatch. The backend renders the payload (thermal label as TSPL, or the
// consolidated PDF packet) and enqueues a PrintJob for the branch's local agent to pick up and
// print silently. The board's panel of recent jobs (`GET /print/jobs`, retry) is gone: it existed to
// reprint consolidated sheets, which the shop no longer prints.
export const printApi = {
  label: (orderId: string, pieceId: number) =>
    httpClient.post<PrintJobCreated>(`${BASE}/label`, { orderId, pieceId }),
  consolidated: (orderId: string) =>
    httpClient.post<PrintJobCreated>(`${BASE}/consolidated`, { orderId }),
}
