import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { draftsApi } from './draftsApi'
import type { OptimizerDraftPayload } from './types'

const LIST_KEY = ['optimization-drafts']

// List of saved drafts (name + dates, no payload). `branchId` filters by branch (global roles only).
export const useDrafts = (branchId?: number) =>
  useQuery({
    queryKey: [...LIST_KEY, { branchId }],
    queryFn: () => draftsApi.list(branchId),
  })

interface SaveDraftVars {
  id?: number | null
  name: string
  payload: OptimizerDraftPayload
  // Creation only (POST); on PUT the branch is already fixed and not re-sent.
  branchId?: number | null
}

// Creates (POST) or updates (PUT) based on whether `id` is present. Invalidates the list on success.
export const useSaveDraft = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, payload, branchId }: SaveDraftVars) =>
      id ? draftsApi.update(id, { name, payload }) : draftsApi.create({ name, payload, branchId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export const useDeleteDraft = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => draftsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}
