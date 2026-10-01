import { useEffect, useRef, type ReactNode } from 'react'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  useColorModes,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import AppHeaderDropdown from './AppHeaderDropdown'
import { THEME_OPTIONS } from './themeOptions'
import NotificationBell from 'src/features/notifications/NotificationBell'

// The header's frame, the same in the office and in a workspace: one sticky row that gains a
// shadow once the page scrolls under it, with the bell, the theme and the user menu at its right
// end. What goes at the left end — the way around the office, or the workspace's name and its way
// out — is the caller's (`AppHeader`, `WorkspaceHeader`).
//
// Below `md` the theme selector moves into the user menu, which leaves the left end the room.
interface ShellHeaderProps {
  children: ReactNode
}

const ShellHeader = ({ children }: ShellHeaderProps) => {
  const headerRef = useRef<HTMLDivElement>(null)
  // One instance for both selectors, so the header icon and the user menu's check agree.
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
      }
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <CHeader position="sticky" className="mb-3 p-0" ref={headerRef} role="banner">
      <CContainer className="border-bottom px-3 px-md-4" fluid>
        {children}
        {/* `role={undefined}`: CoreUI stamps `role="navigation"` on these <ul>s, which strips their
            list semantics and orphans every <li> inside (axe `listitem`, on every screen). */}
        <CHeaderNav role={undefined}>
          <NotificationBell />
        </CHeaderNav>
        <CHeaderNav role={undefined}>
          <li className="nav-item py-1 d-none d-md-block">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <CDropdown variant="nav-item" placement="bottom-end" className="d-none d-md-block">
            <CDropdownToggle caret={false} aria-label="Tema">
              {colorMode === 'dark' ? (
                <Icon name="themeDark" size="lg" />
              ) : colorMode === 'auto' ? (
                <Icon name="themeAuto" size="lg" />
              ) : (
                <Icon name="themeLight" size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              {THEME_OPTIONS.map((option) => (
                <CDropdownItem
                  key={option.value}
                  active={colorMode === option.value}
                  className="d-flex align-items-center"
                  as="button"
                  type="button"
                  onClick={() => setColorMode(option.value)}
                >
                  <Icon className="me-2" name={option.icon} size="lg" /> {option.label}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown colorMode={colorMode} onColorModeChange={setColorMode} />
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}

export default ShellHeader
