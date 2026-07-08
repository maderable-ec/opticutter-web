import { createCrudApi } from 'src/shared/api/crudApi'
import type { Branch, BranchListParams, BranchPayload, BranchUpdatePayload } from './types'

export const branchesApi = createCrudApi<
  Branch,
  BranchListParams,
  BranchPayload,
  BranchUpdatePayload,
  number
>('/api/v1/branches')
