import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilLockLocked, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from 'src/features/auth/useAuth'
import { ROLE_LABELS } from 'src/features/auth/roleLabels'

// Initials from the full name (first letter of the first two words) fall back to the email.
const initialsFor = (fullName: string | null | undefined, email: string | undefined) => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length > 0)
    return parts
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('')
  return email ? email[0]!.toUpperCase() : '?'
}

const AppHeaderDropdown = () => {
  const user = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  const displayName = user?.fullName ?? user?.email ?? '—'
  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? displayName
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''
  const initials = initialsFor(user?.fullName, user?.email)

  return (
    <CDropdown variant="nav-item" placement="bottom-end">
      <CDropdownToggle className="py-0 pe-0 d-flex align-items-center gap-2" caret={false}>
        <CAvatar color="secondary" textColor="white" shape="rounded-circle" size="md">
          {initials}
        </CAvatar>
        <span className="d-none d-sm-inline fw-semibold">{firstName}</span>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" style={{ minWidth: 200 }}>
        <CDropdownHeader className="d-flex align-items-center justify-content-between gap-2 bg-body-secondary">
          <span className="fw-semibold text-truncate">{displayName}</span>
          {roleLabel && <CBadge color="secondary">{roleLabel}</CBadge>}
        </CDropdownHeader>
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
