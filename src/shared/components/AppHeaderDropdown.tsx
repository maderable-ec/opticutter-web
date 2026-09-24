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
import { rolesLabel } from 'src/features/auth/roleLabels'
import { THEME_OPTIONS } from './themeOptions'

// Initials from the full name (first letter of the first two words) fall back to the email.
const initialsFor = (fullName: string | null | undefined, email: string | undefined) => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length > 0)
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('')
  return email ? email.charAt(0).toUpperCase() : '?'
}

interface AppHeaderDropdownProps {
  colorMode: string | undefined
  onColorModeChange: (mode: string) => void
}

const AppHeaderDropdown = ({ colorMode, onColorModeChange }: AppHeaderDropdownProps) => {
  const user = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  const displayName = user?.fullName ?? user?.email ?? '—'
  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? displayName
  const roleLabel = rolesLabel(user?.roles)
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
        <CDropdownItem onClick={() => void navigate('/profile')} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilUser} className="me-2" />
          Perfil
        </CDropdownItem>
        <CDropdownItem
          onClick={() => void navigate('/profile/change-password')}
          style={{ cursor: 'pointer' }}
        >
          <CIcon icon={cilLockLocked} className="me-2" />
          Cambiar contraseña
        </CDropdownItem>
        {/* The header's own theme selector is hidden below `md` to give the title room, so on a
            phone the choice lives here. A wrapper carries the breakpoint rather than each item:
            the items' `d-flex` and `d-md-none` are both `!important`. */}
        <div className="d-md-none">
          <CDropdownDivider />
          <CDropdownHeader className="text-body-secondary small">Tema</CDropdownHeader>
          {THEME_OPTIONS.map((option) => (
            <CDropdownItem
              key={option.value}
              active={colorMode === option.value}
              className="d-flex align-items-center"
              as="button"
              type="button"
              onClick={() => onColorModeChange(option.value)}
            >
              <CIcon icon={option.icon} className="me-2" />
              {option.label}
            </CDropdownItem>
          ))}
        </div>
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
