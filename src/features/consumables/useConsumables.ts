import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consumablesApi } from './consumablesApi'
import type { RegisterChangePayload } from './types'

const STATUS_KEY = ['consumables', 'status'] as const
const REPORT_KEY = ['analytics', 'consumables'] as const

// Asked for when the sheet opens, not polled: nobody watches a blade's metres, and the figure is
// only acted on at the moment of a change. A minute of staleness is what reopening the sheet costs.
export const useConsumablesStatus = (branchId: number | undefined, enabled: boolean) =>
  useQuery({
    queryKey: [...STATUS_KEY, { branchId }],
    queryFn: () => consumablesApi.status(branchId),
    enabled,
    staleTime: 60_000,
  })

export const useConsumablesReport = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: [...REPORT_KEY, { from, to, branchId }],
    queryFn: () => consumablesApi.report(from, to, branchId),
    placeholderData: keepPreviousData,
  })

// Both writes hold their `isPending` until the status on screen is the new one (the promise is
// returned): the card must not flash its old buttons between the answer and the refetch.
const useRefresh = () => {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: STATUS_KEY }),
      qc.invalidateQueries({ queryKey: REPORT_KEY }),
    ])
}

export const useRegisterChange = () => {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (data: RegisterChangePayload) => consumablesApi.register(data),
    onSuccess: refresh,
    // A refusal usually means the screen was stale (somebody else just changed it).
    onError: refresh,
  })
}

export const useVoidChange = () => {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ changeId, reason }: { changeId: number; reason?: string }) =>
      consumablesApi.void(changeId, reason),
    onSuccess: refresh,
    onError: refresh,
  })
}
