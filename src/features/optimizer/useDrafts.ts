import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { draftsApi } from './draftsApi'
import type { OptimizerDraftPayload } from './types'

const LIST_KEY = ['optimization-drafts']

// Listado de borradores guardados (nombre + fechas, sin payload).
export const useDrafts = () =>
  useQuery({
    queryKey: LIST_KEY,
    queryFn: draftsApi.list,
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
}

// Crea (POST) o actualiza (PUT) según haya `id`. Invalida la lista al terminar.
export const useSaveDraft = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, payload }: SaveDraftVars) =>
      id ? draftsApi.update(id, { name, payload }) : draftsApi.create({ name, payload }),
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
