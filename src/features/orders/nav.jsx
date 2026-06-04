import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilTask } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

export const ordersNav = [
  {
    component: CNavItem,
    name: 'Órdenes',
    to: '/orders',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
  },
]
