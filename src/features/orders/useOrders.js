import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { boardsApi, clientsApiMin, ordersApi } from './ordersApi'

export const useOrders = (params) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  })

export const useOrder = (id) =>
  useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  })

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export const useOptimize = () =>
  useMutation({
    mutationFn: ordersApi.optimize,
  })

export const useReviewLinkInfo = (id, status) =>
  useQuery({
    queryKey: ['review-link', id],
    queryFn: () => ordersApi.getReviewLinkInfo(id),
    enabled: !!id && status === 'quoted',
    retry: false,
  })

export const useCreateReviewLink = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => ordersApi.createReviewLink(id),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: ['review-link', id] }),
  })
}

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => ordersApi.updateStatus(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useAssociateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => ordersApi.associateInvoice(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', id] })
    },
  })
}

export const useBoards = () =>
  useQuery({
    queryKey: ['boards'],
    queryFn: boardsApi.list,
    staleTime: 5 * 60 * 1000,
  })

export const useClientsMin = (search) =>
  useQuery({
    queryKey: ['clients-min', search],
    queryFn: () => clientsApiMin.list(search),
  })
