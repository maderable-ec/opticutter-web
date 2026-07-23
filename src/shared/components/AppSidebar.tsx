import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import { ordersNav, workshopBoardNav } from 'src/features/orders/nav'

import { AppSidebarNav } from './AppSidebarNav'
import CIcon from '@coreui/icons-react'
import { branchesNav } from 'src/features/branches/nav'
import { clientsNav } from 'src/features/clients/nav'
import { dashboardNav } from 'src/features/dashboard/nav'
import { logo } from 'src/assets/brand/logo'
import { memo } from 'react'
import { optimizerNav } from 'src/features/optimizer/nav'
import { preordersNav } from 'src/features/preorders/nav'
import { printNav } from 'src/features/print/nav'
import { productsNav } from 'src/features/products/nav'
import { servicesNav } from 'src/features/services/nav'
import { settingsNav } from 'src/features/settings/nav'
import { sygnet } from 'src/assets/brand/sygnet'
import { useAuthStore } from 'src/shared/store/authStore'
import useUIStore from 'src/shared/store/uiStore'
import { usersNav } from 'src/features/users/nav'

const allNavItems = [
  ...dashboardNav,
  ...optimizerNav,
  ...preordersNav,
  ...ordersNav,
  ...workshopBoardNav,
  ...clientsNav,
  ...productsNav,
  ...servicesNav,
  ...branchesNav,
  ...printNav,
  ...usersNav,
  ...settingsNav,
]

const AppSidebar = () => {
  const unfoldable = useUIStore((state) => state.sidebarUnfoldable)
  const sidebarShow = useUIStore((state) => state.sidebarShow)
  const setSidebarShow = useUIStore((state) => state.setSidebarShow)
  const setSidebarUnfoldable = useUIStore((state) => state.setSidebarUnfoldable)
  const userRole = useAuthStore((s) => s.user?.role)

  const navigation = allNavItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole)),
  )

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => setSidebarShow(visible)}
    >
      <CSidebarHeader className="border-bottom justify-content-center">
        <CSidebarBrand>
          <CIcon customClassName="sidebar-brand-full" icon={logo} height={48} />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton className="d-lg-none" dark onClick={() => setSidebarShow(false)} />
      </CSidebarHeader>
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler onClick={() => setSidebarUnfoldable(!unfoldable)} />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default memo(AppSidebar)
