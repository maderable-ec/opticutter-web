import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { draftsApi } from './draftsApi'
import type { OptimizerDraftPayload } from './types'

const LIST_KEY = ['optimization-drafts']

// Listado de borradores guardados (nombre + fechas, sin payload). `branchId` (sólo admin) filtra.
export const useDrafts = (branchId?: number) =>
  useQuery({
    queryKey: [...LIST_KEY, { branchId }],
    queryFn: () => draftsApi.list(branchId),
  })

// Detalle de un borrador (incluye payload). `enabled` evita disparar sin id.
export const useDraft = (id?: number) =>
  useQuery({
    queryKey: ['optimization-drafts', id],
    queryFn: () => draftsApi.get(id as number),
    enabled: !!id,
  })

interface SaveDraftVars {
  id?: number | null
  name: string
  payload: OptimizerDraftPayload
  // Sólo en creación y sólo para admin; en el PUT no se reenvía (la sucursal ya quedó fijada).
  branchId?: number | null
}

// Crea (POST) o actualiza (PUT) según haya `id`. Invalida la lista al terminar.
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
