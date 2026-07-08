import type { Role } from './types'

// Roles that see and operate across all branches (global branch axis).
export const GLOBAL_BRANCH_ROLES = ['administrador', 'vendedor'] as const
export const isGlobalBranchRole = (role?: string): boolean =>
  (GLOBAL_BRANCH_ROLES as readonly string[]).includes(role ?? '')

// Landing path per role. The dashboard is admin-only, so each role lands on a route it can access;
// this prevents the redirect loop (/ → /dashboard → / …) for non-admins.
export const homePathForRole = (role: Role | undefined): string => {
  switch (role) {
    case 'administrador':
      return '/dashboard'
    case 'vendedor':
      return '/optimizer'
    case 'operador':
      return '/workshop-board'
    case 'canteador':
      return '/workshop-board' // only view for this role: the shared workshop board
    default:
      return '/orders' // accessible to all authenticated roles
  }
}
