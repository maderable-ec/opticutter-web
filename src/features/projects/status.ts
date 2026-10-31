import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { Role } from 'src/features/auth/types'
import type { ProjectStatus } from './types'

// Where a designer's project stands, and what each role may do with it from the listing. The API is
// the lock (`projects:write`, `preorders`, `PROJECT_TRANSITIONS`); this only decides which buttons
// to draw, so a seller is never offered a move the server would refuse.

// `in_progress` is a draft on the drawing board; `ready` waits on a seller, so it asks for a look.
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, StatusConfigEntry> = {
  in_progress: { tone: 'neutral', icon: 'designing', label: 'En curso' },
  ready: { tone: 'progress', icon: 'projectReady', label: 'Listo para cotizar' },
  quoted: { tone: 'success', icon: 'projectQuoted', label: 'Cotizado' },
  archived: { tone: 'graphite', icon: 'archived', label: 'Archivado' },
}

// Mirror of `projects:write` and of `preorders` (who quotes) in the API's `RESOURCE_ROLES`.
export const PROJECT_WRITE_ROLES: readonly Role[] = ['administrador', 'proyectista']
export const PROJECT_QUOTE_ROLES: readonly Role[] = ['administrador', 'vendedor']

export type ProjectAction = 'quote' | 'open' | 'reopen' | 'archive'

/**
 * The moves a listing row offers, in order (the first is the row's main one). The designer opens a
 * project in progress in the optimizer, reopens a ready or archived one, and shelves it; a quoted one
 * is read-only. The seller quotes a ready one, and a quoted one again (a rejected quote is quoted
 * anew). Marking it ready is not here: it is done in the optimizer, with the plan on screen.
 */
export const projectActions = (
  status: ProjectStatus,
  { canWrite, canQuote }: { canWrite: boolean; canQuote: boolean },
): ProjectAction[] => {
  const actions: ProjectAction[] = []
  if (canQuote && (status === 'ready' || status === 'quoted')) actions.push('quote')
  if (canWrite) {
    if (status === 'in_progress') actions.push('open', 'archive')
    if (status === 'ready') actions.push('reopen', 'archive')
    if (status === 'archived') actions.push('reopen')
  }
  return actions
}

// The listing's status filter. `open` is the designer's desk (what is not done yet); `ready` is the
// sellers' queue.
export type ProjectView = 'open' | 'in_progress' | 'ready' | 'quoted' | 'archived' | 'all'

export const PROJECT_VIEWS: { id: ProjectView; label: string; statuses?: ProjectStatus[] }[] = [
  { id: 'open', label: 'En curso y listos', statuses: ['in_progress', 'ready'] },
  { id: 'ready', label: 'Listos para cotizar', statuses: ['ready'] },
  { id: 'in_progress', label: 'En curso', statuses: ['in_progress'] },
  { id: 'quoted', label: 'Cotizados', statuses: ['quoted'] },
  { id: 'archived', label: 'Archivados', statuses: ['archived'] },
  { id: 'all', label: 'Todos' },
]

/** The view a listing opens on: the designer's desk, or the queue of a role that only quotes. */
export const defaultProjectView = (canWrite: boolean): ProjectView => (canWrite ? 'open' : 'ready')

/** The statuses a view asks the API for (`undefined` = every status). */
export const viewStatuses = (view: string): ProjectStatus[] | undefined =>
  PROJECT_VIEWS.find((v) => v.id === view)?.statuses
