import type { Role } from './types'

// Roles que ven y operan sobre todas las sucursales (eje sucursal global).
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

// Pantalla de inicio por rol. El dashboard es admin-only, así que cada rol aterriza en una ruta a la
// que sí tiene acceso; esto evita el bucle de redirección (/ → /dashboard → / …) para no-admins.
export const homePathForRole = (role: Role | undefined): string => {
  switch (role) {
    case 'administrador':
      return '/dashboard'
    case 'vendedor':
      return '/optimizer'
    case 'operador':
      return '/orders'
    case 'canteador':
      return '/banding' // su única vista: la cola de canteado
    default:
      return '/orders' // ruta accesible para todos los roles autenticados
  }
}
