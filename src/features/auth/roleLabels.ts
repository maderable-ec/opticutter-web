import type { Role } from './types'

/** Human-readable labels for the Spanish role values (text contexts: profile, header). */
export const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  operador: 'Operador',
  canteador: 'Canteador',
}

/** Compact labels for badges in tables. */
export const ROLE_SHORT_LABELS: Record<Role, string> = {
  administrador: 'Admin',
  vendedor: 'Vendedor',
  operador: 'Operador',
  canteador: 'Canteador',
}

/** Badge colors per role. */
export const ROLE_COLORS: Record<Role, string> = {
  administrador: 'danger',
  vendedor: 'primary',
  operador: 'secondary',
  canteador: 'info',
}
