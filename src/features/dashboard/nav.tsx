import CIcon from '@coreui/icons-react'
import { cilChartLine } from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const dashboardNav: NavItem[] = [
  {
    component: CNavGroup,
    name: 'Analítica',
    icon: <CIcon icon={cilChartLine} customClassName="nav-icon" />,
    roles: ['administrador'],
    items: [
      { component: CNavItem, name: 'Resumen', to: '/dashboard' },
      { component: CNavItem, name: 'Cuellos de botella', to: '/analytics/bottlenecks' },
      { component: CNavItem, name: 'Productividad', to: '/analytics/users' },
      { component: CNavItem, name: 'Asistencia', to: '/analytics/attendance' },
    ],
  },
]
