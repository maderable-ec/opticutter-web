import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from 'src/shared/store/authStore'
import useUIStore from 'src/shared/store/uiStore'
import {
  backFor,
  bottomNavFor,
  breadcrumbsFor,
  exitFor,
  hasMenu,
  hubFor,
  originFrom,
  originOf,
  returnFor,
  sectionsForRoles,
  sheetHolds,
  sheetSectionsFor,
  workspaceFor,
} from 'src/shared/navigation'
import type { Back, Origin } from 'src/shared/navigation'

// The shell's navigation for the signed-in user on the current screen (rules in `navigation.ts`).
export const useShellNav = () => {
  const roles = useAuthStore((s) => s.user?.roles)
  const location = useLocation()
  const { pathname } = location
  const record = useUIStore((s) => s.recordLabel)
  // Stable per role set: the memoized sidebar re-renders on a sign-in, not on every navigation.
  const sections = useMemo(() => sectionsForRoles(roles), [roles])
  const origin = originFrom(location.state as unknown)
  const bottomNav = bottomNavFor(pathname, roles)
  const sheet = sheetSectionsFor(sections, bottomNav)

  return {
    sections,
    hasMenu: hasMenu(sections),
    bottomNav,
    sheet,
    // «Más» lights when the screen is one of the sheet's: nothing else in the bar would.
    moreCurrent: bottomNav.length > 0 && sheetHolds(sheet, pathname),
    crumbs: breadcrumbsFor(pathname, roles, record),
    hub: hubFor(pathname, roles),
    back: backFor(pathname, roles, origin),
    workspace: workspaceFor(pathname),
    exit: exitFor(pathname, roles, origin),
  }
}

/** The history state that lands on `back` with its own origin intact. */
export const stateFor = (back: Back): { from: Origin } | undefined =>
  back.from ? { from: back.from } : undefined

/**
 * The state a link INTO another screen carries, so that screen's «Volver» comes back here: pass it
 * as `state` to a `Link` or to `navigate`. Lateral moves (the menu, the bottom bar) carry none.
 */
export const useFromHere = (): { from: Origin } => {
  const roles = useAuthStore((s) => s.user?.roles)
  const record = useUIStore((s) => s.recordLabel)
  const location = useLocation()
  return { from: originOf(location, roles, record) }
}

/**
 * Names the record this page shows, once it has loaded: the trail, the tab's title and the origin
 * its links leave behind say «ORD-2026-0041» instead of «Detalle de orden». A code only (see
 * `RecordLabel`). Cleared when the page goes, and keyed by path, so it never outlives its record.
 */
export const useRecordLabel = (label: string | null | undefined) => {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!label) return
    const own = { path: pathname, label }
    useUIStore.getState().setRecordLabel(own)
    return () => {
      if (useUIStore.getState().recordLabel === own) useUIStore.getState().setRecordLabel(null)
    }
  }, [pathname, label])
}

/**
 * «Volver» from this screen: where it was entered from, or the screen above it (`returnFor`).
 * `go` restores that screen's own origin, so going back twice retraces the way in.
 */
export const useBack = () => {
  const roles = useAuthStore((s) => s.user?.roles)
  const location = useLocation()
  const navigate = useNavigate()
  const back = returnFor(location.pathname, roles, originFrom(location.state as unknown))
  return { ...back, go: () => void navigate(back.to, { state: stateFor(back) }) }
}
