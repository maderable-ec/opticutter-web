import CIcon from '@coreui/icons-react'
import { cilPeople } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const usersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Usuarios',
    to: '/users',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: ['administrador'],
  },
]
