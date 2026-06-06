import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilStorage } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

export const productsNav = [
  {
    component: CNavItem,
    name: 'Productos',
    to: '/products',
    icon: <CIcon icon={cilStorage} customClassName="nav-icon" />,
  },
]
