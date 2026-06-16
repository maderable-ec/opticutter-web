import type { Role } from './types'

export const ROUTE_ROLES: Record<string, Role[]> = {
  dashboard: ['administrador'],
  clients: ['administrador', 'vendedor'],
  products: ['administrador', 'vendedor'],
  optimizer: ['administrador', 'vendedor'],
  preorders: ['administrador', 'vendedor'],
  orders: ['administrador', 'vendedor', 'operador'],
  settings: ['administrador'],
  users: ['administrador'],
}

export const canAccess = (role: Role | undefined, key: string): boolean =>
  !role ? false : (ROUTE_ROLES[key] ?? []).includes(role)
