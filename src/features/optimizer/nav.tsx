import CIcon from '@coreui/icons-react'
import { cilCalculator } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const optimizerNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Optimizador',
    to: '/optimizer',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
  },
]
