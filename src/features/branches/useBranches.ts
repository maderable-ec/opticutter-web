import { useQuery } from '@tanstack/react-query'
import { createCrudHooks } from 'src/shared/hooks/createCrudHooks'
import { branchesApi } from './branchesApi'
import type { Branch, BranchListParams, BranchPayload, BranchUpdatePayload } from './types'

const hooks = createCrudHooks<Branch, BranchListParams, BranchPayload, BranchUpdatePayload, number>(
  'branches',
  branchesApi,
)

export const useBranches = hooks.useList
export const useCreateBranch = hooks.useCreate
export const useUpdateBranch = hooks.useUpdate

// Lightweight hook reused by branch selectors across the app: fetches up to 100 branches
// and returns only the active ones. `data` is already typed as `Branch[]`.
export const useActiveBranches = () =>
  useQuery({
    queryKey: ['branches', 'active'],
    queryFn: () => branchesApi.list({ limit: 100 }),
    select: (res): Branch[] => res.items.filter((b) => b.isActive),
  })
