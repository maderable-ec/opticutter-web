import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from './usersApi'
import type { UserListParams, UserUpdatePayload } from './types'

export const useUsers = (params?: UserListParams) =>
  useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params),
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdatePayload }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
