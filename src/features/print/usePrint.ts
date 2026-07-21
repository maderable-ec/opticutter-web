import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from 'src/shared/api/types'
import { useToastStore } from 'src/shared/store/toastStore'
import { printApi, type PrintJobsParams } from './printApi'

// Query key for the shop-floor print-jobs panel; exported so call sites that create a job
// (e.g. completing an order) can invalidate it and surface the new job without waiting for the poll.
export const PRINT_JOBS_KEY = ['print', 'jobs'] as const

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

// Sends a piece's label to the branch's thermal printer. Fire-and-forget: triggered after the
// piece is successfully marked cut, so a print failure surfaces only as a toast and never rolls
// back the cut. Requires `orders:cut` (same as marking the piece), so no extra role gate is needed
// at the call sites (whoever can mark can print).
export const usePrintLabel = () => {
  const addToast = useToastStore((s) => s.addToast)
  return useMutation({
    mutationFn: ({ orderId, pieceId }: { orderId: string; pieceId: number }) =>
      printApi.label(orderId, pieceId),
    onSuccess: () => addToast('Etiqueta enviada a la cola de impresión', 'success'),
    onError: (err) =>
      addToast(errorMessage(err, 'No se pudo enviar la etiqueta a la impresora'), 'danger'),
  })
}

// Sends the consolidated PDF packet to the branch's inkjet after an order is completed.
// Requires `orders:workshop` (admin/operador/canteador); call sites that also allow other roles
// (e.g. the order detail transition, open to vendedor) must gate the trigger to avoid a 403.
export const usePrintConsolidated = () => {
  const addToast = useToastStore((s) => s.addToast)
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string }) => printApi.consolidated(orderId),
    onSuccess: () => addToast('Hoja consolidada enviada a la cola de impresión', 'success'),
    onError: (err) =>
      addToast(errorMessage(err, 'No se pudo enviar la hoja consolidada a la impresora'), 'danger'),
  })
}

// Polls the branch's recent print jobs for the shop-floor panel. Background refetch keeps the
// real status (imprimiendo/impreso/error) fresh so a failed print surfaces without a manual reload.
export const usePrintJobs = (params?: PrintJobsParams) =>
  useQuery({
    queryKey: [...PRINT_JOBS_KEY, params],
    queryFn: () => printApi.listJobs(params),
    refetchInterval: 15000,
  })

// Re-dispatches a print job: the backend re-renders a fresh payload and enqueues a new job of the
// same type. Used from the panel to retry a print that never came out.
export const useRetryPrintJob = () => {
  const qc = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  return useMutation({
    mutationFn: (jobId: number) => printApi.retry(jobId),
    onSuccess: () => {
      addToast('Reintentando impresión…', 'success')
      void qc.invalidateQueries({ queryKey: PRINT_JOBS_KEY })
    },
    onError: (err) => addToast(errorMessage(err, 'No se pudo reintentar la impresión'), 'danger'),
  })
}
