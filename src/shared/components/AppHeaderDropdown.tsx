import {
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilLockLocked, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from 'src/features/auth/useAuth'
import { ROLE_LABELS } from 'src/features/auth/roleLabels'

const AppHeaderDropdown = () => {
  const user = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

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
        <CDropdownItem onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilUser} className="me-2" />
          Perfil
        </CDropdownItem>
        <CDropdownItem
          onClick={() => navigate('/profile/change-password')}
          style={{ cursor: 'pointer' }}
        >
          <CIcon icon={cilLockLocked} className="me-2" />
          Cambiar contraseña
        </CDropdownItem>
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
