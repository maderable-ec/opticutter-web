import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { useAuthStore } from 'src/shared/store/authStore'

// A list page's filters live in the URL (`useListParams`), and the browser's back button restores
// them. Every other way back does not: the detail's "Volver a …" button, the breadcrumb and the
// sidebar all go to the BARE path, so the seller who filtered, opened a row and came back had to
// filter again. This wrapper remembers the list's last search and puts it back when the list is
// entered bare.
//
// sessionStorage, not memory: the breadcrumb is a plain `href`, a full page load that would wipe
// anything held in a store. Per tab, so two tabs keep two lists, and gone with the tab, so a date
// range from last week does not come back uninvited. Keyed by user, because a shared shop computer
// logs a different person into the same tab.
const storageKey = (list: string, userId: number | undefined) =>
  `cutter:list:${userId ?? 'anon'}:${list}`

const readSaved = (key: string): string => {
  try {
    return sessionStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

const save = (key: string, search: string) => {
  try {
    if (search) sessionStorage.setItem(key, search)
    else sessionStorage.removeItem(key)
  } catch {
    // Storage unavailable (private mode, blocked site data): the list just starts clean next time.
  }
}

// Everything in the URL is worth coming back to (filters, sort, page, page size) except the
// phone's filter sheet, which is a panel that happened to be open, not a filter.
const worthKeeping = (search: string): string => {
  const params = new URLSearchParams(search)
  params.delete(FILTER_SHEET_PARAM)
  const kept = params.toString()
  return kept ? `?${kept}` : ''
}

interface RememberedListProps {
  // Names the list in storage: one entry per list page.
  list: string
  children: ReactNode
}

const RememberedList = ({ list, children }: RememberedListProps) => {
  const { search } = useLocation()
  const userId = useAuthStore((s) => s.user?.id)
  const key = storageKey(list, userId)

  // Decided once, when the list mounts. Arriving at the bare path from outside (the sidebar, the
  // breadcrumb, a detail's "Volver a …") means "the list as I left it". The same bare path reached
  // from INSIDE the list ("Limpiar filtros", or back past the first filter) is the user's own
  // choice, and restoring over it would undo it; the wrapper stays mounted through those, so they
  // never get here.
  const [pending, setPending] = useState(() => (search === '' ? readSaved(key) : ''))
  // Render-phase adjustment: once the URL carries a search, the restore has landed.
  if (pending && search !== '') setPending('')

  useEffect(() => {
    if (!pending) save(key, worthKeeping(search))
  }, [key, pending, search])

  // The list itself never renders the bare state it is about to leave, so it never fetches it.
  if (pending) return <Navigate to={{ search: pending }} replace />
  return children
}

export default RememberedList
