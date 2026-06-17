import CIcon from '@coreui/icons-react'
import { cilBuilding } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const branchesNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Sucursales',
    to: '/branches',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    roles: ['administrador'],
  },
]
