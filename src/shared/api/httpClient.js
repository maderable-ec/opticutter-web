const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`)
    error.status = res.status
    try {
      const body = await res.json()
      error.detail = body.detail
    } catch {}
    throw error
  }
  if (res.status === 204) return null
  return res.json()
}

export const httpClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
