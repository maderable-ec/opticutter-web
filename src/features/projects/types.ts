import type { OptimizerDraftPayload } from 'src/features/optimizer/types'
import type { PreOrderStatus } from 'src/features/preorders/types'

// The designer's projects (`/api/v1/projects`). A project is a cut list drawn in the optimizer and
// handed to the sellers to quote. Its `payload` is the optimizer's form state, the same contract as a
// draft's: the backend stores it as is.

export type ProjectStatus = 'in_progress' | 'ready' | 'quoted' | 'archived'

// A pre-order quoted from the project.
export interface ProjectQuote {
  id: number
  code: string | null
  status: PreOrderStatus
}

export interface ProjectSummary {
  id: number
  name: string
  // Who it is for, as free text: the seller picks the real client when quoting.
  clientName: string | null
  notes: string | null
  status: ProjectStatus
  ownerId: number
  ownerName: string | null
  // Last time it was handed to the sellers.
  readyAt: string | null
  quotes: ProjectQuote[]
  createdAt: string
  updatedAt: string
}

export interface Project extends ProjectSummary {
  payload: OptimizerDraftPayload
}

export interface ProjectWrite {
  name: string
  clientName?: string | null
  notes?: string | null
  payload: OptimizerDraftPayload
}

export interface ProjectListParams {
  status?: ProjectStatus[]
  search?: string
  ownerId?: number
  offset?: number
  limit?: number
}
