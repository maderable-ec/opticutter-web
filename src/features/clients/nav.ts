import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const clientsNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Clientes',
    to: '/clients',
    icon: 'clients',
    roles: ['administrador', 'vendedor'],
  },
]
