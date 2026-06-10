import CIcon from '@coreui/icons-react'
import { cilPeople } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const clientsNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Clientes',
    to: '/clients',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
]
