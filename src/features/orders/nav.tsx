import CIcon from '@coreui/icons-react'
import { cilLayers, cilTask } from '@coreui/icons'
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

// Cola de canteado: única navegación del canteador (admin también la ve).
export const bandingNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Canteado',
    to: '/banding',
    icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
    roles: ['administrador', 'canteador'],
  },
]
