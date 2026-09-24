import type { Role } from './types'

// A user holds a list of roles and is granted the UNION of their permissions: the mirror of the
// backend's `has_any_role`. Every role check in the app goes through here.
export const hasAnyRole = (
  userRoles: readonly string[] | undefined,
  allowed: readonly string[],
): boolean => !!userRoles && userRoles.some((role) => allowed.includes(role))

// Canonical order, the backend's `UserRole` declaration order: the API returns `roles` in it.
export const ROLE_ORDER: readonly Role[] = ['administrador', 'vendedor', 'operador', 'canteador']

// Roles that see and operate across all branches (global branch axis).
export const GLOBAL_BRANCH_ROLES = ['administrador', 'vendedor'] as const
export const isGlobalBranchRole = (roles: readonly string[] | undefined): boolean =>
  hasAnyRole(roles, GLOBAL_BRANCH_ROLES)

// The only roles that combine on one user (a bander learning to cut holds both): the mirror of
// `UserService._normalize_roles`. The global ones stay exclusive.
export const WORKSHOP_ROLES: readonly Role[] = ['operador', 'canteador']

/** The role set after ticking or unticking one role, holding the combination rule. */
export const toggleRole = (current: readonly Role[], role: Role, checked: boolean): Role[] => {
  if (!checked) return current.filter((r) => r !== role)
  // A global role replaces everything; a workshop one drops any global role it joins.
  const kept = WORKSHOP_ROLES.includes(role)
    ? current.filter((r) => WORKSHOP_ROLES.includes(r))
    : []
  return ROLE_ORDER.filter((r) => r === role || kept.includes(r))
}

// Landing path for a set of roles. The dashboard is admin-only, so each user lands on a route they
// can access; this prevents the redirect loop (/ → /dashboard → / …) for non-admins. `/profile` is
// the one route every authenticated user reaches.
export const homePathForRoles = (roles: readonly Role[] | undefined): string => {
  if (hasAnyRole(roles, ['administrador'])) return '/dashboard'
  if (hasAnyRole(roles, ['vendedor'])) return '/optimizer'
  // The shop floor's only shared view, for the operator and the bander alike.
  if (hasAnyRole(roles, WORKSHOP_ROLES)) return '/workshop-board'
  return '/profile'
}
