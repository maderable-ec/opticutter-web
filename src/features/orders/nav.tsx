import CIcon from '@coreui/icons-react'
import { cilGrid, cilTask } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const ordersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Órdenes',
    to: '/orders',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
    roles: ['administrador', 'vendedor'],
  },
]

// Shared workshop board: card queue for operador (cutting) and canteador (banding); admin sees it too.
export const workshopBoardNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Tablero',
    to: '/workshop-board',
    icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
    roles: ['administrador', 'operador', 'canteador'],
  },
]
