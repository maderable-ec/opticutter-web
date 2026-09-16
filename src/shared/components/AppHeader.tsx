import { useEffect, useRef } from 'react'
import useUIStore from 'src/shared/store/uiStore'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilContrast, cilMenu, cilMoon, cilSun } from '@coreui/icons'

import AppBreadcrumb from './AppBreadcrumb'
import AppHeaderDropdown from './AppHeaderDropdown'
import { THEME_OPTIONS } from './themeOptions'
import NotificationBell from 'src/features/notifications/NotificationBell'

// One row, not two. The breadcrumb used to have a strip of its own below this one, and the role
// shortcuts that sat here duplicated the sidebar link for link — so the breadcrumb took their place
// and the second strip is gone. It doubles as the page title now: pages that dropped their own
// heading (the optimizer) still say what they are, without paying a row for it.
//
// On a phone the row cannot carry all of it: the trail was left ~140px and every crumb ellipsized
// into "Ho… / Ór… / Deta…". Below `md` the trail shows only its active crumb (see
// `.header-breadcrumb` in style.scss) and the theme selector moves into the user menu, which leaves
// toggler · title · bell · avatar.
const AppHeader = () => {
  const headerRef = useRef<HTMLDivElement>(null)
  // One instance for both selectors, so the header icon and the user menu's check agree.
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const sidebarShow = useUIStore((state) => state.sidebarShow)
  const setSidebarShow = useUIStore((state) => state.setSidebarShow)

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
    <CHeader position="sticky" className="mb-3 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-3 px-md-4" fluid>
        <CHeaderToggler
          onClick={() => setSidebarShow(!sidebarShow)}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        {/* `min-width: 0` is what lets a long trail ellipsize instead of pushing the icons off the
            right edge — a flex item's default `min-width: auto` refuses to shrink past its content. */}
        <div className="header-breadcrumb me-auto overflow-hidden" style={{ minWidth: 0 }}>
          <AppBreadcrumb />
        </div>
        <CHeaderNav>
          <NotificationBell />
        </CHeaderNav>
        <CHeaderNav>
          <li className="nav-item py-1 d-none d-md-block">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <CDropdown variant="nav-item" placement="bottom-end" className="d-none d-md-block">
            <CDropdownToggle caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
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
                  <CIcon className="me-2" icon={option.icon} size="lg" /> {option.label}
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

export default AppHeader
