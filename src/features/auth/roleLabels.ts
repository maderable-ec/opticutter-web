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

/** Combined color + compact label per role, ready for the shared StatusBadge. */
export const ROLE_BADGE_CONFIG: Record<Role, { color: string; label: string }> = {
  administrador: { color: ROLE_COLORS.administrador, label: ROLE_SHORT_LABELS.administrador },
  vendedor: { color: ROLE_COLORS.vendedor, label: ROLE_SHORT_LABELS.vendedor },
  operador: { color: ROLE_COLORS.operador, label: ROLE_SHORT_LABELS.operador },
  canteador: { color: ROLE_COLORS.canteador, label: ROLE_SHORT_LABELS.canteador },
}
