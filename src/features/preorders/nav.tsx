import CIcon from '@coreui/icons-react'
import { cilFile } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const preordersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Cotizaciones',
    to: '/preorders',
    icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
    roles: ['administrador', 'vendedor'],
  },
]
