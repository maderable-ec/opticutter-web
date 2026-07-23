import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from 'src/shared/api/types'
import { useToastStore } from 'src/shared/store/toastStore'
import { printAgentsApi, type PrintAgentPayload } from './printAgentsApi'

const AGENTS_KEY = ['print', 'agents'] as const

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

// Registered agents with their presence (`lastSeenAt`). Refetched on an interval so the admin
// can watch a shop PC come online right after configuring it, without reloading.
export const usePrintAgents = () =>
  useQuery({
    queryKey: AGENTS_KEY,
    queryFn: printAgentsApi.list,
    refetchInterval: 30000,
  })

// Registers a branch's agent. The response carries the raw token ONE time — the caller must
// show it to the admin, because it is unrecoverable afterwards.
export const useCreatePrintAgent = () => {
  const qc = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  return useMutation({
    mutationFn: (data: PrintAgentPayload) => printAgentsApi.create(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: AGENTS_KEY }),
    onError: (err) => addToast(errorMessage(err, 'No se pudo crear el agente'), 'danger'),
  })
}

// Issues a new token and revokes the previous one: the agent stops printing until its
// config.ini is updated, so it's the way to cut off a lost or leaked token.
export const useRotatePrintAgentToken = () => {
  const qc = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  return useMutation({
    mutationFn: (id: number) => printAgentsApi.rotateToken(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: AGENTS_KEY }),
    onError: (err) => addToast(errorMessage(err, 'No se pudo rotar el token'), 'danger'),
  })
}

// Logical retirement (there is no DELETE): a deactivated token stops authenticating, and the
// agent's job history is preserved.
export const useSetPrintAgentActive = () => {
  const qc = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      printAgentsApi.setActive(id, isActive),
    onSuccess: () => void qc.invalidateQueries({ queryKey: AGENTS_KEY }),
    onError: (err) => addToast(errorMessage(err, 'No se pudo actualizar el agente'), 'danger'),
  })
}
