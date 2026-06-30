import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewApi } from './reviewApi'

// The token is the sole credential; a 404 (non-existent/revoked token) is final → no retry.
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
    // The POST response already carries the new state: we render from it directly.
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
