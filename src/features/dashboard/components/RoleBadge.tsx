import { CBadge } from '@coreui/react'
import type { Role } from 'src/features/auth/types'

// Same colors/labels as UsersPage for visual consistency.
const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Admin',
  vendedor: 'Vendedor',
  operador: 'Operador',
  canteador: 'Canteador',
}
const ROLE_COLORS: Record<Role, string> = {
  administrador: 'danger',
  vendedor: 'primary',
  operador: 'secondary',
  canteador: 'info',
}

interface RoleBadgeProps {
  role: Role
}

const RoleBadge = ({ role }: RoleBadgeProps) => (
  <CBadge color={ROLE_COLORS[role] ?? 'secondary'}>{ROLE_LABELS[role] ?? role}</CBadge>
)

export default RoleBadge
