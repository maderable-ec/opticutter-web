import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { branchesApi } from './branchesApi'
import type { Branch, BranchListParams, BranchUpdatePayload } from './types'

export const useBranches = (params?: BranchListParams) =>
  useQuery({
    queryKey: ['branches', params],
    queryFn: () => branchesApi.list(params),
  })

// Lightweight hook reused by branch selectors across the app: fetches up to 100 branches
// and returns only the active ones. `data` is already typed as `Branch[]`.
export const useActiveBranches = () =>
  useQuery({
    queryKey: ['branches', 'active'],
    queryFn: () => branchesApi.list({ limit: 100 }),
    select: (res): Branch[] => res.items.filter((b) => b.isActive),
  })

export const useCreateBranch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export const useUpdateBranch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BranchUpdatePayload }) =>
      branchesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export const useDeleteBranch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: branchesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}
