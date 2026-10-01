import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaginatedResult } from 'src/shared/api/types'

interface CrudHooksApi<T, ListParams, CreatePayload, UpdatePayload, Id> {
  list: (params?: ListParams) => Promise<PaginatedResult<T>>
  create: (data: CreatePayload) => Promise<T>
  update: (id: Id, data: UpdatePayload) => Promise<T>
  remove: (id: Id) => Promise<void>
}

// React Query hooks for a CRUD resource: a list query plus create/update/delete mutations,
// each invalidating the `[key]` query family on success. Features with special caching
// (optimistic updates, extra queries) keep their own hand-written hooks.
export const createCrudHooks = <
  T,
  ListParams,
  CreatePayload,
  UpdatePayload,
  Id extends string | number,
>(
  key: string,
  api: CrudHooksApi<T, ListParams, CreatePayload, UpdatePayload, Id>,
) => {
  const useList = (params?: ListParams) =>
    useQuery({
      queryKey: [key, params],
      queryFn: () => api.list(params),
      // Every filter edit and page turn is a new query key. Without this the table is torn down to
      // a spinner on each one — the list flashes away under the very toolbar being used to narrow
      // it. Applies to every CRUD listing at once, which is the point of them sharing this factory.
      placeholderData: keepPreviousData,
    })

  // How many rows a set of filters would return, without the rows: the phone filter sheet's «Ver 12
  // productos». One row is the cheapest page that still carries `pagination.total`. Under the same
  // `[key]` family, so a create or a delete refreshes the count with the list.
  const useTotal = (params: ListParams, enabled: boolean) =>
    useQuery({
      queryKey: [key, 'total', params],
      queryFn: () => api.list({ ...params, offset: 0, limit: 1 }),
      select: (res) => res.pagination.total,
      enabled,
      placeholderData: keepPreviousData,
    })

  const useCreate = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (data: CreatePayload) => api.create(data),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    })
  }

  const useUpdate = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: ({ id, data }: { id: Id; data: UpdatePayload }) => api.update(id, data),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    })
  }

  const useDelete = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (id: Id) => api.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    })
  }

  return { useList, useTotal, useCreate, useUpdate, useDelete }
}
