import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewApi } from './reviewApi'

// El token es la única credencial; el 404 (token inexistente/revocado) es definitivo → sin retry.
export const useReview = (token) =>
  useQuery({
    queryKey: ['review', token],
    queryFn: () => reviewApi.get(token),
    enabled: !!token,
    retry: false,
  })

export const useConfirmReview = (token) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note) => reviewApi.confirm(token, note),
    // La respuesta del POST ya trae el estado nuevo: renderizamos desde ahí.
    onSuccess: (data) => qc.setQueryData(['review', token], data),
  })
}

export const useRejectReview = (token) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note) => reviewApi.reject(token, note),
    onSuccess: (data) => qc.setQueryData(['review', token], data),
  })
}
