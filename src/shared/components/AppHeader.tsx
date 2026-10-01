import { Link } from 'react-router-dom'
import useUIStore from 'src/shared/store/uiStore'
import type { Back, Crumb } from 'src/shared/navigation'
import { stateFor } from 'src/shared/hooks/useShellNav'
import { CHeaderToggler } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import AppBreadcrumb from './AppBreadcrumb'
import ShellHeader from './ShellHeader'

// One row, not two. The breadcrumb used to have a strip of its own below this one, and the role
// shortcuts that sat here duplicated the sidebar link for link — so the breadcrumb took their place
// and the second strip is gone. It doubles as the page title now: pages that dropped their own
// heading (the optimizer) still say what they are, without paying a row for it.
//
// On a phone the row cannot carry all of it: the trail was left ~140px and every crumb ellipsized
// into "Ho… / Ór… / Deta…". Below `md` the trail shows only its active crumb (see
// `.header-breadcrumb` in _shell.scss) and the theme selector moves into the user menu, which leaves
// toggler · title · bell · avatar.
//
// The left end on a phone is one of three things. Inside a record: «‹ Órdenes», the way back (to
// wherever the record was opened from, see `returnFor`), and no title (the record says what it is
// right under it). On a screen with the bottom nav: the title alone, because «Más» already opens
// the menu. Anywhere else (the optimizer's steps): «Menú», the only way out of the flow, which opens
// the same sheet as «Más» with the whole menu in it. From `md` up the header has no menu button:
// the sidebar is always on screen, a rail and then the full menu. A role with nothing to choose
// from gets no button at all.
interface AppHeaderProps {
  hasMenu: boolean
  withBottomNav: boolean
  crumbs: Crumb[]
  back: Back | null
}

const AppHeader = ({ hasMenu, withBottomNav, crumbs, back }: AppHeaderProps) => {
  const sheetShow = useUIStore((state) => state.navSheetShow)
  const setSheetShow = useUIStore((state) => state.setNavSheetShow)

  return (
    <ShellHeader>
      {hasMenu && !back && !withBottomNav && (
        <CHeaderToggler
          className="d-md-none"
          onClick={() => setSheetShow(true)}
          style={{ marginInlineStart: '-14px' }}
          aria-label="Menú"
          aria-haspopup="dialog"
          aria-expanded={sheetShow}
        >
          <Icon name="more" size="lg" />
        </CHeaderToggler>
      )}
      {back && (
        <Link to={back.to} state={stateFor(back)} className="header-back d-md-none me-auto">
          {/* The ActionBar's own «‹», not CoreUI's chevron, whose outline reads as a double one. */}
          <span className="header-back-mark" aria-hidden>
            ‹
          </span>
          {back.name}
        </Link>
      )}
      {/* `min-width: 0` is what lets a long trail ellipsize instead of pushing the icons off the
          right edge — a flex item's default `min-width: auto` refuses to shrink past its content. */}
      <div
        className={`header-breadcrumb me-auto overflow-hidden${back ? ' d-none d-md-block' : ''}`}
        style={{ minWidth: 0 }}
      >
        <AppBreadcrumb crumbs={crumbs} />
      </div>
    </ShellHeader>
  )
}

export default AppHeader
