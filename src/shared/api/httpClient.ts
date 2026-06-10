import { ApiError } from './types'
import type { ApiErrorItem, PaginatedResult, Pagination } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
}

interface ErrorBody {
  errors?: ApiErrorItem[]
  meta?: { requestId?: string }
}

const buildError = (status: number, body: ErrorBody): ApiError => {
  const message = body.errors?.[0]?.message ?? `HTTP ${status}`
  return new ApiError(status, message, body.errors ?? [], body.meta?.requestId ?? '')
}

const send = async (path: string, options: RequestOptions): Promise<Response> =>
  fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const res = await send(path, options)
  if (res.status === 204) return null as T
  const body = await res.json()
  if (!res.ok) throw buildError(res.status, body)
  return body.data as T
}

const requestList = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<PaginatedResult<T>> => {
  const res = await send(path, options)
  const body = await res.json()
  if (!res.ok) throw buildError(res.status, body)
  return { items: body.data as T[], pagination: body.meta.pagination as Pagination }
}

export const httpClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  list: <T>(path: string) => requestList<T>(path),
}
