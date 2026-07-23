import { httpClient } from 'src/shared/api/httpClient'

const BASE = '/api/v1/print/agents'

// A print agent: the branch's shop PC that long-polls the backend and drives its local
// printers. One per shop is enough — a single agent handles both job types (labels and
// consolidated sheets), including printers reached over the LAN.
export interface PrintAgent {
  id: number
  branchId: number
  name: string
  isActive: boolean
  // Refreshed on every long-poll: the presence indicator that tells "no imprime" apart
  // from "the shop PC is off". Null until the agent polls for the first time.
  lastSeenAt: string | null
}

// Returned ONLY at creation and rotation: the raw device token to paste into the agent's
// config.ini. Only its sha256 is stored, so it can never be read back.
export interface PrintAgentWithToken extends PrintAgent {
  token: string
}

export interface PrintAgentPayload {
  branchId: number
  name: string
}

// Agent registration and token issuance (admin-only, permission `print:agents`). There is
// no DELETE by design: an agent is retired by deactivating it, which stops its token from
// authenticating while its job history stays intact.
export const printAgentsApi = {
  list: () => httpClient.get<PrintAgent[]>(BASE),
  create: (data: PrintAgentPayload) => httpClient.post<PrintAgentWithToken>(BASE, data),
  rotateToken: (id: number) => httpClient.post<PrintAgentWithToken>(`${BASE}/${id}/rotate-token`),
  setActive: (id: number, isActive: boolean) =>
    httpClient.patch<PrintAgent>(`${BASE}/${id}`, { isActive }),
}
