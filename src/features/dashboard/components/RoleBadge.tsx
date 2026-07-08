import { CBadge } from '@coreui/react'
import type { Role } from 'src/features/auth/types'
import { ROLE_COLORS, ROLE_SHORT_LABELS } from 'src/features/auth/roleLabels'

interface RoleBadgeProps {
  role: Role
}

const RoleBadge = ({ role }: RoleBadgeProps) => (
  <CBadge color={ROLE_COLORS[role] ?? 'secondary'}>{ROLE_SHORT_LABELS[role] ?? role}</CBadge>
)

export default RoleBadge
