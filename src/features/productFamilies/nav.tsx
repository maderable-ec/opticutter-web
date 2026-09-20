import CIcon from '@coreui/icons-react'
import { cilLayers } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const productFamiliesNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Familias',
    to: '/product-families',
    // Same roles as the catalog it groups: the seller reads it, the admin edits.
    icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
    roles: ['administrador', 'vendedor'],
  },
]
