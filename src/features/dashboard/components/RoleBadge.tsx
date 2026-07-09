import StatusBadge from 'src/shared/components/StatusBadge'
import type { Role } from 'src/features/auth/types'
import { ROLE_BADGE_CONFIG } from 'src/features/auth/roleLabels'

interface RoleBadgeProps {
  role: Role
}

const RoleBadge = ({ role }: RoleBadgeProps) => (
  <StatusBadge config={ROLE_BADGE_CONFIG} value={role} />
)

export default RoleBadge
