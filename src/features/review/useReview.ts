import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewApi } from './reviewApi'

// El token es la única credencial; el 404 (token inexistente/revocado) es definitivo → sin retry.
export const useReview = (token?: string) =>
  useQuery({
    queryKey: ['review', token],
    queryFn: () => reviewApi.get(token as string),
    enabled: !!token,
    retry: false,
  })

export const useConfirmReview = (token: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) => reviewApi.confirm(token, note),
    // La respuesta del POST ya trae el estado nuevo: renderizamos desde ahí.
    onSuccess: (data) => qc.setQueryData(['review', token], data),
  })
}

export const useRejectReview = (token: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) => reviewApi.reject(token, note),
    onSuccess: (data) => qc.setQueryData(['review', token], data),
  })
}

export const useRequestChangesReview = (token: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) => reviewApi.requestChanges(token, note),
    onSuccess: (data) => qc.setQueryData(['review', token], data),
  })
}
