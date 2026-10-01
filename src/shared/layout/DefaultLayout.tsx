import type { MouseEvent } from 'react'

import AppContent from '../components/AppContent'
import AppSidebar from '../components/AppSidebar'
import AppHeader from '../components/AppHeader'
import AppToaster from '../components/AppToaster'
import BottomNav from '../components/BottomNav'
import NavSheet from '../components/NavSheet'
import SectionNav from '../components/SectionNav'
import WorkspaceHeader from '../components/WorkspaceHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useShellNav } from '../hooks/useShellNav'
import { pageTitle } from '../navigation'
import useUIStore from '../store/uiStore'

const CONTENT_ID = 'contenido'

// Focus moved by hand rather than by following the `#contenido` link: the fragment would stay in
// the URL of every screen after it.
const skipToContent = (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault()
  document.getElementById(CONTENT_ID)?.focus()
}

// No footer: its one line («Powered by…») cost 49px under every screen, and on a phone that is the
// strip the bottom nav and the action bar need. The credit lives on the login and in the user menu.
//
// Inside a workspace (the Taller) the office's shell steps aside: no sidebar, no bottom bar, and a
// header that names the place and holds its way out. A page that covers the viewport with a bar of
// its own (the cutting canvas) gets no header at all, nor a link to skip it.
const DefaultLayout = () => {
  const { sections, hasMenu, bottomNav, sheet, moreCurrent, crumbs, back, hub, workspace, exit } =
    useShellNav()
  const withBottomNav = bottomNav.length > 0
  const withSidebar = hasMenu && !workspace
  const narrowSidebar = useUIStore((state) => state.sidebarNarrow)
  const immersive = !!workspace?.immersive

  const screen = crumbs[crumbs.length - 1]?.name
  useDocumentTitle(pageTitle(crumbs))

  return (
    <div>
      {/* The first stop of the Tab key: past the admin's nine menu entries in one keystroke. */}
      {!immersive && (
        <a
          href={`#${CONTENT_ID}`}
          className="skip-link visually-hidden-focusable"
          onClick={skipToContent}
        >
          Saltar al contenido
        </a>
      )}
      {withSidebar && <AppSidebar sections={sections} />}
      <div
        className={`wrapper d-flex flex-column min-vh-100${withSidebar ? ' has-side-nav' : ''}${withSidebar && narrowSidebar ? ' has-narrow-nav' : ''}${withBottomNav ? ' has-bottom-nav' : ''}`}
      >
        {workspace ? (
          !immersive && <WorkspaceHeader workspace={workspace} exit={exit} />
        ) : (
          <AppHeader hasMenu={hasMenu} withBottomNav={withBottomNav} crumbs={crumbs} back={back} />
        )}
        <main id={CONTENT_ID} className="body flex-grow-1" tabIndex={-1}>
          {/* The screen's name as its heading, for a screen reader: on screen the header already
              says it (the breadcrumb's last crumb, or the workspace's name), and pages carry no
              title of their own. */}
          {screen && <h1 className="visually-hidden">{screen}</h1>}
          {/* A hub's tabs, inside `main` so the skip link lands right above them. Not for a hub
              with a single tab for this role: a choice of one is no choice. */}
          {hub && hub.tabs.length > 1 && <SectionNav hub={hub} />}
          <AppContent />
        </main>
      </div>
      {withBottomNav && <BottomNav items={bottomNav} moreCurrent={moreCurrent} />}
      {/* The phone's menu, for «Más» and for the optimizer's «Menú»; from `md` up the sidebar is
          always on screen. */}
      {withSidebar && <NavSheet sections={sheet} />}
      <AppToaster />
    </div>
  )
}

export default DefaultLayout
