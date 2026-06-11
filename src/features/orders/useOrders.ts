import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientsApiMin, ordersApi } from './ordersApi'
import type {
  OrderListParams,
  OrderStatus,
  UpdateStatusPayload,
  AssociateInvoicePayload,
} from './types'

export const useOrders = (params?: OrderListParams) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  })

export const useOrder = (id?: string) =>
  useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id as string),
    enabled: !!id,
  })

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export const useReviewLinkInfo = (id?: string, status?: OrderStatus) =>
  useQuery({
    queryKey: ['review-link', id],
    queryFn: () => ordersApi.getReviewLinkInfo(id as string),
    enabled: !!id && status === 'quoted',
    retry: false,
  })

export const useCreateReviewLink = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersApi.createReviewLink(id),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: ['review-link', id] }),
  })
}

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStatusPayload }) =>
      ordersApi.updateStatus(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useAssociateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssociateInvoicePayload }) =>
      ordersApi.associateInvoice(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', id] })
    },
  })
}

export const useClientsMin = (search?: string) =>
  useQuery({
    queryKey: ['clients-min', search],
    queryFn: () => clientsApiMin.list(search),
  })
