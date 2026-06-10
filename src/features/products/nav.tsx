import CIcon from '@coreui/icons-react'
import { cilStorage } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const productsNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Productos',
    to: '/products',
    icon: <CIcon icon={cilStorage} customClassName="nav-icon" />,
  },
]
