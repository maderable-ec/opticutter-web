import { useMutation } from '@tanstack/react-query'

import { ApiError } from 'src/shared/api/types'
import { useToastStore } from 'src/shared/store/toastStore'
import { printApi } from './printApi'

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
    onSuccess: () => addToast('Etiqueta enviada a la impresora', 'success'),
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
    onSuccess: () => addToast('Hoja consolidada enviada a la impresora', 'success'),
    onError: (err) =>
      addToast(errorMessage(err, 'No se pudo enviar la hoja consolidada a la impresora'), 'danger'),
  })
}
