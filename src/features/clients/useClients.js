import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from './clientsApi'

export const useClients = (params) =>
  useQuery({
    queryKey: ['clients', params],
    queryFn: () => clientsApi.list(params),
  })

export const useCreateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export const useUpdateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export const useDeleteClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clientsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}
