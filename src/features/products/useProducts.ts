import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productsApi } from './productsApi'
import type { ProductListParams, ProductPayload } from './types'

export const useProducts = (params?: ProductListParams) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
  })

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductPayload }) =>
      productsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
