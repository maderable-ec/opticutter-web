export interface Client {
  id: string
  firstName: string
  lastName: string
  identifier: string
  email?: string
  phone?: string
  source?: string
}

export interface ClientPayload {
  firstName: string
  lastName: string
  identifier: string
  email?: string
  phone?: string
  source?: string
}

export interface ClientListParams {
  search?: string
  offset?: number
  limit?: number
}
