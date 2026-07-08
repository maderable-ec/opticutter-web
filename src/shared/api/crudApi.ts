import { httpClient } from './httpClient'
import type { PaginatedResult } from './types'
import { PAGE_SIZE } from 'src/shared/constants'

// Builds a query string with `offset`/`limit` (defaulting to 0 / PAGE_SIZE) plus any
// extra filter keys. Empty/nullish values are skipped; array values become repeated
// params (`?status=a&status=b`). Accepts any object (feature `*ListParams` interfaces).
export const toQuery = (params: object = {}): string => {
  const sp = new URLSearchParams({ offset: '0', limit: String(PAGE_SIZE) })
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      sp.delete(key)
      value.forEach((v) => sp.append(key, String(v)))
    } else {
      sp.set(key, String(value))
    }
  }
  return sp.toString()
}

export interface CrudApi<T, ListParams, CreatePayload, UpdatePayload, Id> {
  list: (params?: ListParams) => Promise<PaginatedResult<T>>
  get: (id: Id) => Promise<T>
  create: (data: CreatePayload) => Promise<T>
  update: (id: Id, data: UpdatePayload) => Promise<T>
  remove: (id: Id) => Promise<void>
}

// Standard REST resource client for `${base}` with list/get/create/update/remove.
// Features spread the result to add resource-specific methods.
export const createCrudApi = <
  T,
  ListParams extends object = object,
  CreatePayload = unknown,
  UpdatePayload = CreatePayload,
  Id extends string | number = number,
>(
  base: string,
): CrudApi<T, ListParams, CreatePayload, UpdatePayload, Id> => ({
  list: (params?: ListParams) => httpClient.list<T>(`${base}/?${toQuery(params ?? {})}`),
  get: (id: Id) => httpClient.get<T>(`${base}/${id}`),
  create: (data: CreatePayload) => httpClient.post<T>(`${base}/`, data),
  update: (id: Id, data: UpdatePayload) => httpClient.put<T>(`${base}/${id}`, data),
  remove: (id: Id) => httpClient.delete<void>(`${base}/${id}`),
})
