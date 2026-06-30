// Branch (store location) — top-level resource of the multi-branch API model.
export interface Branch {
  id: number
  code: string
  name: string
  address: string | null
  phone: string | null
  isActive: boolean
}

// Compact branch reference embedded in orders, pre-orders, and drafts. The FK is mandatory
// in those documents, so it is never optional. Shared type for the "owning branch" pattern.
export interface BranchRef {
  id: number
  code: string
  name: string
}

export interface BranchPayload {
  code: string
  name: string
  address?: string
  phone?: string
}

export interface BranchUpdatePayload {
  code?: string
  name?: string
  address?: string
  phone?: string
  isActive?: boolean
}

export interface BranchListParams {
  search?: string
  offset?: number
  limit?: number
}
