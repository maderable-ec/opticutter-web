const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const buildError = (status, body) => {
  const error = new Error(body.errors?.[0]?.message ?? `HTTP ${status}`)
  error.status = status
  error.errors = body.errors ?? []
  error.requestId = body.meta?.requestId ?? ''
  return error
}

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (res.status === 204) return null
  const body = await res.json()
  if (!res.ok) throw buildError(res.status, body)
  return body.data
}

const requestList = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const body = await res.json()
  if (!res.ok) throw buildError(res.status, body)
  return { items: body.data, pagination: body.meta.pagination }
}

export const httpClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  list: (path) => requestList(path),
}
