import type { Role } from './types'

// Roles that see and operate across all branches (global branch axis).
export const GLOBAL_BRANCH_ROLES = ['administrador', 'vendedor'] as const
export const isGlobalBranchRole = (role?: string): boolean =>
  GLOBAL_BRANCH_ROLES.includes(role as any)

export const ROUTE_ROLES: Record<string, Role[]> = {
  dashboard: ['administrador'],
  clients: ['administrador', 'vendedor'],
  products: ['administrador', 'vendedor'],
  optimizer: ['administrador', 'vendedor'],
  preorders: ['administrador', 'vendedor'],
  orders: ['administrador', 'vendedor', 'operador'],
  banding: ['administrador', 'canteador'],
  settings: ['administrador'],
  users: ['administrador'],
  branches: ['administrador'],
}

export const canAccess = (role: Role | undefined, key: string): boolean =>
  !role ? false : (ROUTE_ROLES[key] ?? []).includes(role)

// Landing path per role. The dashboard is admin-only, so each role lands on a route it can access;
// this prevents the redirect loop (/ → /dashboard → / …) for non-admins.
export const homePathForRole = (role: Role | undefined): string => {
  switch (role) {
    case 'administrador':
      return '/dashboard'
    case 'vendedor':
      return '/optimizer'
    case 'operador':
      return '/orders'
    case 'canteador':
      return '/banding' // only view for this role: the banding queue
    default:
      return '/orders' // accessible to all authenticated roles
  }
}
