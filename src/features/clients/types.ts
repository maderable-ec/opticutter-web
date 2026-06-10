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
  identifier: string
  source: string
  // Optional fields are sent as null (not omitted) to clear them server-side.
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

export interface ClientListParams {
  search?: string
  offset?: number
  limit?: number
}
