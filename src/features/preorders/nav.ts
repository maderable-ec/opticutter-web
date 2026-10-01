import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const preordersNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Cotizaciones',
    to: '/preorders',
    icon: 'quotes',
    roles: ['administrador', 'vendedor'],
  },
]
