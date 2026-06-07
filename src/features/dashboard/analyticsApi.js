import { httpClient } from 'src/shared/api/httpClient'

const buildQs = (params) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) qs.set(k, v)
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const analyticsApi = {
  summary: (from, to) =>
    httpClient.get(`/api/v1/analytics/summary${buildQs({ from, to })}`),
  timeseries: (from, to, granularity = 'day') =>
    httpClient.get(`/api/v1/analytics/timeseries${buildQs({ from, to, granularity })}`),
  statusBreakdown: (from, to) =>
    httpClient.get(`/api/v1/analytics/breakdown/status${buildQs({ from, to })}`),
  operations: (from, to) =>
    httpClient.get(`/api/v1/analytics/operations${buildQs({ from, to })}`),
}
