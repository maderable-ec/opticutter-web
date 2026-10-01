import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const ordersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Órdenes',
    to: '/orders',
    icon: 'orders',
    roles: ['administrador', 'vendedor'],
  },
]

// The Taller: the queue of the operador (cutting) and the canteador (banding), and the admin's too.
// The entry leads into a workspace, so it carries the way back out (`AppSidebarNav`).
export const workshopNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Taller',
    to: '/workshop-board',
    icon: 'workshop',
    roles: ['administrador', 'operador', 'canteador'],
  },
]
