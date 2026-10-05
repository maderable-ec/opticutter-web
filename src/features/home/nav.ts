import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const homeNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Inicio',
    to: '/home',
    icon: 'home',
    roles: ['administrador', 'vendedor'],
  },
]
