import CIcon from '@coreui/icons-react'
import { cilPrint } from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const printNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Agentes de impresión',
    to: '/print-agents',
    icon: <CIcon icon={cilPrint} customClassName="nav-icon" />,
    roles: ['administrador'],
  },
]
