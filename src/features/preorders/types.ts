import type { Client } from 'src/features/clients/types'
import type { BranchRef } from 'src/features/branches/types'
import type {
  MaterialInput,
  OptimizeResponse,
  PackingStrategy,
  RequirementInput,
} from 'src/features/optimizer/types'

export type PreOrderStatus =
  | 'draft'
  | 'sent'
  | 'changes_requested'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'

export interface PreOrderListParams {
  status?: PreOrderStatus
  clientId?: number
  // Filtro efectivo para roles globales (admin y vendedor); el operador queda acotado a su sucursal.
  branchId?: number
  offset?: number
  limit?: number
}

export interface PreOrderSummary {
  id: number
  code: string
  client: Client
  // Sucursal dueña (FK obligatoria): siempre presente en listado y detalle.
  branch: BranchRef
  status: PreOrderStatus
  source: string
  orderId: number | null
  createdAt: string
  updatedAt: string
  expiresAt: string | null
}

// Auditoría (PR #39): línea de tiempo de cambios de estado de la pre-orden.
export interface PreOrderStatusHistoryEntry {
  id: number
  fromStatus?: PreOrderStatus
  toStatus: PreOrderStatus
  actor?: 'staff' | 'client' | 'system'
  actorUserId?: number | null
  actorLabel?: string | null
  note?: string | null
  createdAt: string
}

export interface PreOrder extends PreOrderSummary {
  notes: string | null
  clientNote: string | null // note written by client when requesting changes
  sentAt: string | null
  confirmedAt: string | null
  priceTierCode?: string
  strategy?: PackingStrategy
  // Always present in GET /preorders/{id} and PUT responses
  materials: MaterialInput[]
  requirements: RequirementInput[]
  optimization: OptimizeResponse
  history: PreOrderStatusHistoryEntry[]
}

export interface PreOrderCreate {
  clientId: number
  notes?: string
  source?: string
  priceTierCode?: string
  strategy?: PackingStrategy
  materials: MaterialInput[]
  requirements: RequirementInput[]
  // Operador: lo omite (backend usa su sucursal). Vendedor: opcional, backend usa su base si se omite.
  // Admin: obligatorio.
  branchId?: number
}

export interface ReviewLink {
  token: string
  url: string
  status: string
  expiresAt: string
  createdAt: string
}

export interface ReviewLinkInfo {
  status: 'active' | 'used' | 'revoked'
  createdAt: string
  expiresAt: string
  usedAt: string | null
}
