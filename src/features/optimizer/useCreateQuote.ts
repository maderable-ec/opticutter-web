import { useNavigate } from 'react-router-dom'

import { useHasRole, useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { useCreatePreOrder } from 'src/features/preorders/usePreOrders'
import { buildServiceLines, type ServiceLineForm } from 'src/features/preorders/useServiceLines'
import { trackPreorderCreated } from 'src/shared/analytics'
import type { LayoutAdjustment, MaterialInput, OptimizeResponse, RequirementInput } from './types'
import type { QuoteDraft } from './useQuoteDraft'
import { unplacedReason } from './useOptimizerWizard'

// Creating the pre-order from the Cotización step. Out of `QuoteStep` so the PAGE can put
// «Crear cotización» in the pinned action bar, where every other step keeps its next move: at the
// foot of the stacked form it sat below the stock alert, the reference and the summary — a whole
// phone screen away from the client field it was waiting for.

interface CreateQuoteInput {
  result?: OptimizeResponse
  materials: MaterialInput[]
  requirements: RequirementInput[]
  // Chosen in Costos, where its effect on the numbers is visible; sent with the pre-order.
  priceLevel: number
  // Alternative-solution seed of the layout on screen, so every recompute reproduces it.
  variant: number
  // The seller's hand adjustments to that layout.
  layoutAdjustments: LayoutAdjustment[] | null
  services: ServiceLineForm[]
  draft: QuoteDraft
  // After the pre-order exists (the page clears its autosave).
  onCreated?: () => void
}

export const useCreateQuote = ({
  result,
  materials,
  requirements,
  priceLevel,
  variant,
  layoutAdjustments,
  services,
  draft,
  onCreated,
}: CreateQuoteInput) => {
  const navigate = useNavigate()
  const isAdmin = useHasRole('administrador')
  const isGlobalBranch = useIsGlobalBranchRole()
  const createPreOrder = useCreatePreOrder()

  const client = draft.client
  const missingPhone = !!client && client.phone == null
  // The wizard does not reach this step while the plan leaves pieces out; checked again here
  // because a quote with them must never be created, whatever the route in.
  const unplacedCount = (result?.unplaced ?? []).reduce((acc, u) => acc + u.quantity, 0)

  // What the button is waiting for, in words — a dim button with no reason is how a seller ends up
  // reporting that a click did nothing. `undefined` means it can go.
  const blockedReason =
    unplacedCount > 0
      ? `${unplacedReason(unplacedCount)}; corrígelo en Costos.`
      : !client
        ? 'Falta elegir el cliente.'
        : missingPhone
          ? 'El cliente no tiene celular registrado.'
          : isAdmin && !draft.branchId
            ? 'Falta elegir la sucursal.'
            : undefined

  const create = () => {
    if (blockedReason || !client) return
    createPreOrder.mutate(
      {
        clientId: Number(client.id),
        source: 'dashboard',
        notes: draft.notes || undefined,
        priceLevel,
        variant,
        layoutAdjustments,
        materials,
        requirements,
        additionalServices: buildServiceLines(services),
        branchId: isGlobalBranch && draft.branchId ? Number(draft.branchId) : undefined,
      },
      {
        onSuccess: (preOrder) => {
          trackPreorderCreated(preOrder.id, (layoutAdjustments?.length ?? 0) > 0)
          onCreated?.()
          void navigate(`/preorders/${preOrder.id}`)
        },
      },
    )
  }

  return {
    create,
    blockedReason,
    isPending: createPreOrder.isPending,
    error: createPreOrder.error,
  }
}

export type CreateQuote = ReturnType<typeof useCreateQuote>
