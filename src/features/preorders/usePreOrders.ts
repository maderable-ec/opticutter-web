import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preordersApi } from './preordersApi'
import { isOpen } from './status'
import type { PreOrderCreate, PreOrderListParams, PreOrderStatus } from './types'

export const usePreOrders = (params?: PreOrderListParams) =>
  useQuery({
    queryKey: ['preorders', params],
    queryFn: () => preordersApi.list(params),
    // Every filter edit and page turn is a new query key. Without this the table is torn down to a
    // spinner on each one — the list flashes away under the very toolbar being used to narrow it.
    placeholderData: keepPreviousData,
  })

export const usePreOrder = (id?: number) =>
  useQuery({
    queryKey: ['preorders', id],
    queryFn: () => preordersApi.get(id as number),
    enabled: !!id,
  })

export const useCreatePreOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PreOrderCreate) => preordersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preorders'] }),
  })
}

export const useUpdatePreOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PreOrderCreate> }) =>
      preordersApi.update(id, data),
    // A single broad invalidation covers both the detail (['preorders', id]) and the list; also
    // invalidating the exact detail key would refetch that same query a second time.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preorders'] }),
  })
}

export const useDeletePreOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => preordersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preorders'] }),
  })
}

export const useCreatePreOrderReviewLink = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => preordersApi.createReviewLink(id),
    // The pre-order itself has to be invalidated too, not just the link: the POST transitions the
    // quote to `sent` and stamps `sentAt`, so without this the badge kept saying "Borrador" and the
    // status strip kept offering the action that had just been taken, until someone reloaded.
    //
    // Safe even though GET /preorders/{id} re-optimizes on read: `PreOrderView` seeds its editable
    // state (materials, requirements, optimization, the dirty baseline) with `useState` and carries
    // no `key`, so a refetch re-seeds nothing. Only what is read straight off the prop — status,
    // dates, the client — follows the server.
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['preorder-link', id] })
      void qc.invalidateQueries({ queryKey: ['preorders'] })
    },
  })
}

export const usePreOrderReviewLinkInfo = (id?: number, status?: PreOrderStatus) =>
  useQuery({
    queryKey: ['preorder-link', id],
    queryFn: () => preordersApi.getReviewLinkInfo(id as number),
    // Only an open quote can still carry a link; on a closed one the endpoint has nothing to say.
    enabled: !!id && !!status && isOpen(status),
    retry: false,
  })
