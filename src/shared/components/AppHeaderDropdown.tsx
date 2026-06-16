import {
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useCurrentUser, useLogout } from 'src/features/auth/useAuth'

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Admin',
  vendedor: 'Vendedor',
  operador: 'Operador',
}

const AppHeaderDropdown = () => {
  const user = useCurrentUser()
  const logout = useLogout()

  const displayName = user?.fullName ?? user?.email ?? '—'
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''

  return (
    <CDropdown variant="nav-item" placement="bottom-end">
      <CDropdownToggle className="py-0 pe-0 d-flex align-items-center gap-2" caret={false}>
        <span className="d-none d-sm-inline fw-semibold">{displayName}</span>
        {roleLabel && (
          <CBadge color="secondary" className="d-none d-sm-inline">
            {roleLabel}
          </CBadge>
        )}
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" style={{ minWidth: 200 }}>
        <CDropdownDivider />
        <CDropdownItem onClick={logout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Cerrar sesión
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
