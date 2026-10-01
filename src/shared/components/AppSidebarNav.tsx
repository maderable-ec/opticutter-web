import { Link, NavLink, useLocation } from 'react-router-dom'
import { useId } from 'react'
import type { ElementType, ReactNode } from 'react'

import Icon from 'src/shared/icons/Icon'
import type { IconName } from 'src/shared/icons/registry'

import { useFromHere } from '../hooks/useShellNav'
import { entryCurrent, navLeaves } from '../navigation'
import type { NavSection } from '../navigation'
import type { WorkspaceId } from '../routes'

export interface NavItem {
  component: ElementType
  name?: ReactNode
  icon?: IconName
  to?: string
  items?: NavItem[]
  roles?: string[]
  // A hub's entry (`HUBS`), declared by its id; `sectionsForRoles` fills in `to` and `matches`.
  hub?: string
  // Every path the entry stands for: a hub's entry opens its first tab and stays lit on all of them.
  matches?: string[]
  // A hub's tabs by name, for the phone's sheet to say what is in it.
  tabs?: string[]
  // The workspace the entry leads into; `sectionsForRoles` fills it in from the route.
  workspace?: WorkspaceId
  // The menu's one action («Cotizar»): the sidebar draws it as the button on top instead of a row,
  // as the phone's bar draws it as its disc (`BottomNavItem.primary`). The phone's sheet lists it.
  action?: boolean
  [key: string]: unknown
}

interface HubNavLinkProps {
  to: string
  matches: string[]
  children: ReactNode
}

// A `NavLink` only lights on its own path, and a hub's entry has to stay lit on every tab. On the
// path it opens it is the page; on another tab it is the place the page is in.
const HubNavLink = ({ to, matches, children }: HubNavLinkProps) => {
  const { pathname } = useLocation()
  const current = entryCurrent({ to, matches }, pathname)
  return (
    <Link
      to={to}
      className={`side-nav__link${current ? ' active' : ''}`}
      aria-current={current ?? undefined}
    >
      {children}
    </Link>
  )
}

// Going into a workspace is not a move between screens: the workspace has no menu to come back by,
// so its «Salir» needs to know where this was (`exitFor`). Every other entry carries nothing.
const WorkspaceNavLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <NavLink to={to} state={useFromHere()} className="side-nav__link">
    {children}
  </NavLink>
)

const NavEntry = ({ item }: { item: NavItem }) => {
  const { name, icon, to, matches, workspace } = item
  if (!to) return null
  const content = (
    <>
      {icon && <Icon name={icon} />}
      <span className="side-nav__label">{name}</span>
    </>
  )
  if (matches) {
    return (
      <HubNavLink to={to} matches={matches}>
        {content}
      </HubNavLink>
    )
  }
  if (workspace) return <WorkspaceNavLink to={to}>{content}</WorkspaceNavLink>
  return (
    <NavLink to={to} className="side-nav__link">
      {content}
    </NavLink>
  )
}

// A section is a list named by its title. The rail has no room for the title and draws a hairline
// in its place, but the list keeps its name: `aria-labelledby` reads a hidden element all the same.
const NavSectionList = ({ section }: { section: NavSection }) => {
  const titleId = useId()
  const items = navLeaves(section.items).filter((item) => !item.action)
  if (items.length === 0) return null
  return (
    <div className="side-nav__section">
      {section.title && (
        <div id={titleId} className="side-nav__title">
          {section.title}
        </div>
      )}
      <ul className="side-nav__list" aria-labelledby={section.title ? titleId : undefined}>
        {items.map((item, i) => (
          <li key={item.to ?? i}>
            <NavEntry item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

interface AppSidebarNavProps {
  sections: NavSection[]
}

// The entries, a list per section, less the action (the button on top, `AppSidebar`). A group is its
// children, as in the phone's sheet: no entry has any today, and a level to open is one more tap the
// rail has no room to show.
export const AppSidebarNav = ({ sections }: AppSidebarNavProps) => (
  <>
    {sections.map((section, i) => (
      <NavSectionList key={section.title ?? i} section={section} />
    ))}
  </>
)
