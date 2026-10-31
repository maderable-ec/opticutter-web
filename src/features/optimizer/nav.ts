import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const optimizerNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Cotizar',
    to: '/preorders/new',
    icon: 'optimizer',
    actionIcon: 'quoteAction',
    roles: ['administrador', 'vendedor'],
    // The sidebar's button on top, not a row: the one entry that starts work.
    action: true,
  },
]
