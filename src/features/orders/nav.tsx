import CIcon from '@coreui/icons-react'
import { cilTask } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const ordersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Órdenes',
    to: '/orders',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
    roles: ['administrador', 'vendedor', 'operador'],
  },
]
