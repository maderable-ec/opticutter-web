import { useCallback, useState } from 'react'

import { useCurrentUser, useHasRole } from 'src/features/auth/useAuth'
import type { Client } from 'src/features/clients/types'

// What the Cotización step collects and the optimizer cannot infer. It lives in the PAGE, like the
// pieces, the materials and the services: `OptimizerPage` mounts only the active step, so state held
// inside `QuoteStep` was destroyed by a single "Atrás" — a seller who went back to fix one measure
// came forward to an empty form and had to look the client up again.
//
// Not in the localStorage autosave, deliberately: leaving `/optimizer` changes `pathname` and
// unmounts the page, so coming back gives a clean sheet the same way it gives no optimize result.
export interface QuoteDraft {
  // The client OBJECT, not its id: the picker, the phone check and the summary read it directly,
  // so none of them depends on the current search results still containing that row.
  client: Client | null
  clientSearch: string
  branchId: string
  notes: string
}

export interface QuoteDraftState {
  draft: QuoteDraft
  setField: <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) => void
  reset: () => void
}

export const useQuoteDraft = (): QuoteDraftState => {
  const user = useCurrentUser()
  const isAdmin = useHasRole('administrador')

  // Admin: no pre-selection (the branch is a required field for them). Sales rep: their own branch.
  // The auth store is plain zustand, read synchronously, so this is safe in a lazy initializer even
  // though the hook now runs at page mount instead of when the step is reached.
  const initial = useCallback(
    (): QuoteDraft => ({
      client: null,
      clientSearch: '',
      branchId: isAdmin ? '' : String(user?.branchId ?? ''),
      notes: '',
    }),
    [isAdmin, user],
  )

  const [draft, setDraft] = useState<QuoteDraft>(initial)

  const setField = useCallback(
    <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    [],
  )

  const reset = useCallback(() => setDraft(initial()), [initial])

  return { draft, setField, reset }
}
