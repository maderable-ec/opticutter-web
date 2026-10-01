import { CSidebarToggler } from '@coreui/react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import BrandMark from 'src/shared/icons/BrandMark'
import Icon from 'src/shared/icons/Icon'
import { navLeaves } from 'src/shared/navigation'
import type { NavSection } from 'src/shared/navigation'
import useUIStore from 'src/shared/store/uiStore'

import { AppSidebarNav } from './AppSidebarNav'

interface AppSidebarProps {
  // Already filtered to the user's roles (`sectionsForRoles`).
  sections: NavSection[]
}

// The menu from `md` up, the same markup at every width and the stylesheet deciding how much of it
// shows: a rail of icons, each over its name, up to `xl`, and the full sidebar from there. Nothing
// unfolds on hover: the rail it replaces hid every name until the pointer came over it, and on a
// touch screen it never did. Below `md` the phone has its bottom bar and sheet.
//
// From `xl` the arrow at its foot narrows the full menu to the rail and back (remembered in the
// browser): the optimizer's despiece is the screen that wants the width more than the names.
//
// `sidebar-dark` is CoreUI's dark menu palette on its own (no `.sidebar` comes with it): the same
// text, icon and fill tones the menu had, over the brand black.
//
// «Cotizar» on top as the coral button (the entry marked `action`), the one thing that starts work
// rather than going somewhere: the optimizer as it was left, like the phone's disc. Its icon is the
// one the entry had as a row, with a small «+».
const AppSidebar = ({ sections }: AppSidebarProps) => {
  const narrow = useUIStore((state) => state.sidebarNarrow)
  const setNarrow = useUIStore((state) => state.setSidebarNarrow)
  const action = sections.flatMap((section) => navLeaves(section.items)).find((item) => item.action)
  const actionName = typeof action?.name === 'string' ? action.name : undefined

  return (
    <nav
      className={`side-nav sidebar-dark${narrow ? ' side-nav--narrow' : ''}`}
      aria-label="Menú principal"
    >
      <div className="side-nav__brand">
        <BrandMark mark="logo" height={48} className="side-nav__wide" />
        <BrandMark mark="sygnet" height={32} className="side-nav__narrow" />
      </div>
      {action?.to && (
        <NavLink
          to={action.to}
          className="btn btn-primary side-nav__create"
          aria-label={actionName}
        >
          <Icon name="quoteAction" size="lg" />
          <span className="side-nav__wide">{action.name}</span>
        </NavLink>
      )}
      <AppSidebarNav sections={sections} />
      <div className="side-nav__footer">
        <CSidebarToggler
          onClick={() => setNarrow(!narrow)}
          aria-label={narrow ? 'Expandir el menú' : 'Contraer el menú'}
        />
      </div>
    </nav>
  )
}

export default memo(AppSidebar)
