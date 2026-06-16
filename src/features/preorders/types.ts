import type { Client } from 'src/features/clients/types'
import type { MaterialInput, OptimizeResponse, RequirementInput } from 'src/features/optimizer/types'

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
  offset?: number
  limit?: number
}

export interface PreOrderSummary {
  id: number
  code: string
  client: Client
  status: PreOrderStatus
  source: string
  orderId: number | null
  createdAt: string
  updatedAt: string
  expiresAt: string | null
}

export interface PreOrder extends PreOrderSummary {
  notes: string | null
  clientNote: string | null // note written by client when requesting changes
  sentAt: string | null
  confirmedAt: string | null
  // Always present in GET /preorders/{id} and PUT responses
  materials: MaterialInput[]
  requirements: RequirementInput[]
  optimization: OptimizeResponse
}

export interface PreOrderCreate {
  clientId: number
  notes?: string
  source?: string
  materials: MaterialInput[]
  requirements: RequirementInput[]
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
