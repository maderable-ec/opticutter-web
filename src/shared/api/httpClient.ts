import { ApiError } from './types'
import type { ApiErrorItem, PaginatedResult, Pagination } from './types'
import type { TokenResponse } from 'src/features/auth/types'
import { useAuthStore } from 'src/shared/store/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
}

// The standard response envelope. `res.json()` is typed `any`, so we assert to this shape
// and treat payloads as `unknown` until each caller narrows them to a concrete `T`.
interface ApiEnvelope {
  data?: unknown
  errors?: ApiErrorItem[]
  meta?: { requestId?: string; pagination?: Pagination }
}

const buildError = (status: number, body: ApiEnvelope): ApiError => {
  const message = body.errors?.[0]?.message ?? `HTTP ${status}`
  return new ApiError(status, message, body.errors ?? [], body.meta?.requestId ?? '')
}

const buildHeaders = (json = true): Record<string, string> => {
  const headers: Record<string, string> = {}
  // For FormData the browser must set Content-Type (with the multipart boundary), so we skip it.
  if (json) headers['Content-Type'] = 'application/json'
  const token = useAuthStore.getState().token
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

const send = async (path: string, options: RequestOptions): Promise<Response> =>
  fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...buildHeaders(!(options.body instanceof FormData)), ...options.headers },
  })

// Session endpoints never trigger a refresh-retry: login/refresh/logout are public
// and a 401 from them means bad credentials or an already-rotated refresh token.
const isSessionRoute = (path: string): boolean => /\/auth\/(login|refresh|logout)/.test(path)

const redirectToLogin = () => {
  window.location.assign('/login')
}

// Single-flight refresh: concurrent 401s share one in-flight refresh promise.
let refreshing: Promise<string> | null = null

const doRefresh = async (): Promise<string> => {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) throw new ApiError(401, 'No refresh token', [], '')
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope
  if (!res.ok) throw buildError(res.status, body)
  const data = body.data as TokenResponse
  // Rotation: always replace the stored pair with the freshly issued one.
  useAuthStore.getState().setSession(data.accessToken, data.refreshToken, data.user)
  return data.accessToken
}

const triggerRefresh = (): Promise<string> =>
  (refreshing ??= doRefresh().finally(() => {
    refreshing = null
  }))

// Sends the request; on a 401 (outside session routes) attempts a single refresh
// and retries once with the rotated access token. On refresh failure, clears the
// session and redirects to login, returning the original 401 so the caller throws.
const fetchWithRefresh = async (path: string, options: RequestOptions): Promise<Response> => {
  const res = await send(path, options)
  if (res.status !== 401 || isSessionRoute(path)) return res
  try {
    await triggerRefresh()
  } catch {
    useAuthStore.getState().clearSession()
    redirectToLogin()
    return res
  }
  return send(path, options)
}

const requestBlob = async (path: string): Promise<Blob> => {
  const res = await fetchWithRefresh(path, {})
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope
    throw buildError(res.status, body)
  }
  return res.blob()
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const res = await fetchWithRefresh(path, options)
  if (res.status === 204) return null as T
  const body = (await res.json()) as ApiEnvelope
  if (!res.ok) throw buildError(res.status, body)
  return body.data as T
}

// Like `request`, but sends FormData (the 401→refresh→retry still works: FormData is replayable).
const requestUpload = async <T>(path: string, form: FormData): Promise<T> => {
  const res = await fetchWithRefresh(path, { method: 'POST', body: form })
  if (res.status === 204) return null as T
  const body = (await res.json()) as ApiEnvelope
  if (!res.ok) throw buildError(res.status, body)
  return body.data as T
}

const requestList = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<PaginatedResult<T>> => {
  const res = await fetchWithRefresh(path, options)
  const body = (await res.json()) as ApiEnvelope
  if (!res.ok) throw buildError(res.status, body)
  return { items: body.data as T[], pagination: body.meta?.pagination as Pagination }
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
  download: (path: string) => requestBlob(path),
  upload: <T>(path: string, form: FormData) => requestUpload<T>(path, form),
}
