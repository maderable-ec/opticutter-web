import CIcon from '@coreui/icons-react'
import { cilCalculator, cilTask } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const ordersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Órdenes',
    to: '/orders',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Optimizaciones',
    to: '/orders/new',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
  },
]
