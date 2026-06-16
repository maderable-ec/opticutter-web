import { memo } from 'react'
import useUIStore from 'src/shared/store/uiStore'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

import { dashboardNav } from 'src/features/dashboard/nav'
import { ordersNav } from 'src/features/orders/nav'
import { preordersNav } from 'src/features/preorders/nav'
import { optimizerNav } from 'src/features/optimizer/nav'
import { clientsNav } from 'src/features/clients/nav'
import { productsNav } from 'src/features/products/nav'
import { settingsNav } from 'src/features/settings/nav'

const navigation = [
  ...dashboardNav,
  ...optimizerNav,
  ...preordersNav,
  ...ordersNav,
  ...clientsNav,
  ...productsNav,
  ...settingsNav,
]

const AppSidebar = () => {
  const unfoldable = useUIStore((state) => state.sidebarUnfoldable)
  const sidebarShow = useUIStore((state) => state.sidebarShow)
  const setSidebarShow = useUIStore((state) => state.setSidebarShow)
  const setSidebarUnfoldable = useUIStore((state) => state.setSidebarUnfoldable)

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => setSidebarShow(visible)}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand>
          <CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />
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
