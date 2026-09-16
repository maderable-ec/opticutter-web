import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

// The search param that says the phone's filter sheet is open. Exported because applying the sheet
// has to drop it in the SAME url write that sets the filters (see `useListParams.setParams`: two
// writes in one tick do not compose).
export const FILTER_SHEET_PARAM = 'filtros'

interface SheetState {
  filterSheet?: boolean
}

/**
 * Open/close state and the draft for `FilterSheet`, the phone's filter panel.
 *
 * Open lives in the URL, not in component state, for the phone's own reason: the back gesture. With
 * a full-screen sheet over the list, back is how an Android user dismisses it — in state, that
 * gesture left the listing altogether. Same idiom as the order detail's `?panel=piezas`.
 *
 * The filters themselves are a DRAFT until "Ver resultados": the list is hidden behind the sheet,
 * so applying each tap only refetched something nobody could see, and pushed one history entry per
 * checkbox — back then undid the filters one at a time instead of closing the panel.
 *
 * History: opening pushes one entry (marked in `location.state`); applying REPLACES it, so back from
 * the new results returns to the previous ones; closing without applying pops it. A sheet that came
 * in with the URL (a refresh while open) has no entry of ours to pop, so it closes by replace.
 */
export const useFilterSheet = <V extends object>(values: V) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<V | null>(null)

  const visible = searchParams.has(FILTER_SHEET_PARAM)

  const open = () => {
    setDraft(values)
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        sp.set(FILTER_SHEET_PARAM, '1')
        return sp
      },
      { state: { filterSheet: true } satisfies SheetState },
    )
  }

  // Idempotent on purpose: `CModal` calls its `onClose` on EVERY exit transition, including the
  // ones this hook caused itself (apply, back). Without the guard, applying would also pop an entry.
  const close = () => {
    if (!visible) return
    if ((location.state as SheetState | null)?.filterSheet) {
      void navigate(-1)
      return
    }
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        sp.delete(FILTER_SHEET_PARAM)
        return sp
      },
      { replace: true },
    )
  }

  const update = <K extends keyof V>(key: K, value: V[K]) =>
    setDraft((prev) => ({ ...(prev ?? values), [key]: value }))

  return {
    visible,
    open,
    close,
    // Falls back to the applied values when the sheet arrived with the URL and was never opened here.
    draft: draft ?? values,
    update,
    replace: setDraft,
  }
}
