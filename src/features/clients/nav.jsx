import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilPeople } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

export const clientsNav = [
  {
    component: CNavItem,
    name: 'Clientes',
    to: '/clients',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
]
