// Shared transport-layer types for the standardized API response envelope.
// Domain models live co-located in each feature's `types.ts`.

export interface ApiErrorItem {
  message: string
  field?: string
  code?: string
}

export interface Pagination {
  total: number
  offset?: number
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  pagination: Pagination
}

/** Error thrown by httpClient on non-2xx responses. Carries the API error envelope. */
export class ApiError extends Error {
  status: number
  errors: ApiErrorItem[]
  requestId: string

  constructor(status: number, message: string, errors: ApiErrorItem[], requestId: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.requestId = requestId
  }
}
