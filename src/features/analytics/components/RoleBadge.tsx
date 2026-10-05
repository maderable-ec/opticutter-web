import StatusBadge from 'src/shared/components/StatusBadge'
import type { Role } from 'src/features/auth/types'
import { ROLE_BADGE_CONFIG } from 'src/features/auth/roleLabels'

interface RoleBadgeProps {
  // A user can hold several roles (operador + canteador): one badge each.
  roles: Role[]
}

const RoleBadge = ({ roles }: RoleBadgeProps) => (
  <span className="d-inline-flex flex-wrap gap-1">
    {roles.map((role) => (
      <StatusBadge key={role} config={ROLE_BADGE_CONFIG} value={role} />
    ))}
  </span>
)

export default RoleBadge
