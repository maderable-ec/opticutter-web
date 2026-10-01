import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { Role } from './types'

/** Human-readable labels for the Spanish role values (text contexts: profile, header). */
export const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  operador: 'Operador',
  canteador: 'Canteador',
}

/** Every role of a user, spelled out: «Operador · Canteador». */
export const rolesLabel = (roles: readonly Role[] | undefined): string =>
  (roles ?? []).map((role) => ROLE_LABELS[role] ?? role).join(' · ')

/** Compact labels for badges in tables. */
export const ROLE_SHORT_LABELS: Record<Role, string> = {
  administrador: 'Admin',
  vendedor: 'Vendedor',
  operador: 'Operador',
  canteador: 'Canteador',
}

/**
 * Tone + compact label per role, ready for the shared StatusBadge. A role is a category, not a
 * state: no icon, and no `danger` for the administrator (it read as an error in the users table).
 */
export const ROLE_BADGE_CONFIG: Record<Role, StatusConfigEntry> = {
  administrador: { tone: 'graphite', label: ROLE_SHORT_LABELS.administrador },
  vendedor: { tone: 'info', label: ROLE_SHORT_LABELS.vendedor },
  operador: { tone: 'neutral', label: ROLE_SHORT_LABELS.operador },
  canteador: { tone: 'neutral', label: ROLE_SHORT_LABELS.canteador },
}
