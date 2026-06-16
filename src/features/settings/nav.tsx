import CIcon from '@coreui/icons-react'
import { cilSettings } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const settingsNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Configuración',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
]
