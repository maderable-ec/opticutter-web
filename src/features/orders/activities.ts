import { hasAnyRole } from 'src/features/auth/permissions'
import type { StatusTone } from 'src/shared/components/StatusBadge'
import type { ActivityStatus, ActivityType, CardAction, OrderActivity, PauseReason } from './types'
import type { IconName } from 'src/shared/icons/registry'

// The work UNDER `in_process`, in one place — the companion of `status.ts`. The board used to
// derive the banding's two buttons inline inside its `map`; with three activities and two roles
// that stopped fitting, and the rule (who may act, what blocks them, why) is not a thing to
// reimplement per screen.

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  cutting: 'Corte',
  banding: 'Canteado',
  additional: 'Adicionales',
}

// Which role registers which activity: the mirror of the backend's ACTIVITY_ROLES. The operator
// cuts; the canteador bands and does the additional work (abisagrado, ranurado, ensamble, división —
// the pieces the seller gave a workshop code, never the billed services). A user with several roles
// registers the union: a bander learning to cut (operador + canteador) gets all three.
export const ACTIVITY_ROLES: Record<ActivityType, string[]> = {
  cutting: ['administrador', 'operador'],
  banding: ['administrador', 'canteador'],
  additional: ['administrador', 'canteador'],
}

// How each activity's own piece set is named — the mirror of the backend's `_PIECE_SET_QUALIFIER`,
// so a greyed-out button says exactly what the API would answer. The cut works on every piece and
// needs no qualifier.
export const ACTIVITY_PIECES_QUALIFIER: Record<ActivityType, string> = {
  cutting: '',
  banding: 'con canto',
  additional: 'con trabajo de taller',
}

// What an API that does not say yet (`pauseReasons` missing) used to take for any activity. Only a
// bridge for the deploy window: the reasons an activity may pause for are the API's to decide, and
// this goes in the release after.
const LEGACY_PAUSE_REASONS: PauseReason[] = ['no_boards', 'no_edge_banding', 'machine_failure']

/**
 * The reasons to offer for pausing this activity, in order. The API bounds them to the activity
 * and to its pieces — the canteador is never out of boards, and nobody waits for pieces that are
 * all cut — so the dialog renders this list and nothing else.
 */
export const pauseReasonsOf = (activity: OrderActivity | undefined): PauseReason[] =>
  activity?.pauseReasons ?? LEGACY_PAUSE_REASONS

export const PAUSE_REASON_LABEL: Record<PauseReason, string> = {
  no_boards: 'Sin tableros',
  no_edge_banding: 'Sin canto',
  machine_failure: 'Daño de máquina',
  waiting_for_pieces: 'Esperando piezas',
}

export const PAUSE_REASON_ICON: Record<PauseReason, IconName> = {
  no_boards: 'board',
  no_edge_banding: 'edgeBand',
  machine_failure: 'machine',
  waiting_for_pieces: 'waitingPieces',
}

/**
 * What the dialog promises under the reasons. A wait is not the office's to fix and the API tells
 * nobody; what the worker needs to know instead is that it ends by itself.
 */
export const pauseReasonNote = (reason: PauseReason | null): string =>
  reason === 'waiting_for_pieces'
    ? 'El tiempo en pausa no cuenta para quien hace el trabajo. Se reanuda sola cuando llegue la siguiente pieza.'
    : 'El tiempo en pausa no cuenta para quien hace el trabajo, y la oficina recibe el aviso.'

/**
 * Whether the activity is paused right now. A pause is a property of work under way: the status
 * stays `in_progress`, so every surface has to ask this rather than read the status alone.
 */
export const isPaused = (activity: OrderActivity | undefined): boolean =>
  activity?.status === 'in_progress' && !!activity.pausedAt

/** «Sin tableros», or a neutral word for a reason this build does not know yet. */
export const pauseReasonLabel = (reason: PauseReason | null | undefined): string =>
  (reason && PAUSE_REASON_LABEL[reason]) || 'En pausa'

// Badge copy per activity and status. `pending` reads as "waiting", not as a problem: an
// activity is pending for as long as the shop has not reached it. The word is no longer
// PRINTED (see the icon below), but it stays here: it is the tooltip and the accessible text.
const STATUS_WORD: Record<ActivityStatus, string> = {
  pending: 'pendiente',
  in_progress: 'en curso',
  done: 'listo',
}

const STATUS_TONE: Record<ActivityStatus, StatusTone> = {
  pending: 'neutral',
  in_progress: 'progress',
  done: 'success',
}

/**
 * The icon that REPLACES the status word on the badge, so it reads "Corte ✓" and not
 * "Corte listo".
 *
 * Two things make the word droppable rather than merely redundant. On the three shop-floor
 * surfaces the button next to the badge already says it — `activityAction` renders "Iniciar
 * canteado" while it is pending and "Terminar canteado" while it runs, and no button at all
 * once it is done — so the badge was repeating in 12px what the screen says in finger size.
 * And the board is read standing, a metre away: a check resolves at that distance, the word
 * "listo" does not. On the listing the same move buys the row back the height that three
 * activities cost it.
 *
 * The three are told apart by SHAPE and not by colour — the rule `elapsed.ts` already follows,
 * and the one that keeps this legible for a colour-blind eye and at arm's length. A clock, a
 * play triangle and a check are three different silhouettes; a circular-arrows icon was
 * rejected for `in_progress` because at this size it is the same blob as the clock.
 */
const STATUS_ICON: Record<ActivityStatus, IconName> = {
  pending: 'pending',
  in_progress: 'inProgress',
  done: 'done',
}

export interface ActivityBadgeConfig {
  tone: StatusTone
  icon: IconName
  /** The track's name — the only text the badge prints. */
  label: string
  /** The word the icon stands for. Not printed; read by the tooltip and by a screen reader. */
  statusWord: string
}

export const activityBadge = (activity: OrderActivity): ActivityBadgeConfig => {
  // Paused is the fourth silhouette: two bars, against the clock, the triangle and the check. Same
  // tone as work under way — it IS work under way, and what tells it apart is the shape.
  if (isPaused(activity)) {
    return {
      tone: 'progress',
      icon: 'paused',
      label: ACTIVITY_LABEL[activity.type],
      statusWord: `en pausa: ${pauseReasonLabel(activity.pauseReason).toLowerCase()}`,
    }
  }
  return {
    tone: STATUS_TONE[activity.status],
    icon: STATUS_ICON[activity.status],
    label: ACTIVITY_LABEL[activity.type],
    statusWord: STATUS_WORD[activity.status],
  }
}

export const findActivity = (
  activities: OrderActivity[] | undefined,
  type: ActivityType,
): OrderActivity | undefined => activities?.find((a) => a.type === type)

export const isDone = (activity: OrderActivity | undefined) => activity?.status === 'done'

/**
 * The buttons an activity offers right now, the main one first.
 *
 * Mirrors the backend's floors so the card can say WHY it is greyed out instead of
 * bouncing the tap: starting needs one piece of the activity's own set cut, finishing needs
 * them all — every piece for the cut, the banded ones for the banding, the ones carrying a
 * workshop code for the additional work. The button stays on screen and disables: on a
 * shop-floor panel, an action that silently disappears is indistinguishable from a bug.
 *
 * Work under way also offers its way out: «Pausar», an outline beside «Terminar». And a paused
 * activity offers ONLY «Reanudar» — the API takes no mark and no close until the pause is lifted,
 * so anything else on screen would be a button that bounces.
 */
export const activityActions = (activity: OrderActivity): CardAction[] => {
  const label = ACTIVITY_LABEL[activity.type]
  const lower = label.toLowerCase()
  const progress = activity.progress ?? { cutPieces: 0, totalPieces: 0 }
  const missing = progress.totalPieces - progress.cutPieces
  const qualifier = ACTIVITY_PIECES_QUALIFIER[activity.type]
  const which = qualifier ? ` ${qualifier}` : ''

  if (activity.status === 'pending') {
    // The cut is its own floor: it IS the cutting, so nothing has to be cut first.
    const blocked = activity.type !== 'cutting' && progress.cutPieces === 0
    return [
      {
        kind: 'start',
        activity: activity.type,
        label: `Iniciar ${lower}`,
        color: 'primary',
        disabled: blocked,
        reason: blocked ? `Falta cortar la primera pieza${which}` : undefined,
      },
    ]
  }
  if (isPaused(activity)) {
    return [
      {
        kind: 'resume',
        activity: activity.type,
        label: `Reanudar ${lower}`,
        color: 'primary',
      },
    ]
  }
  if (activity.status === 'in_progress') {
    const blocked = missing > 0
    return [
      {
        kind: 'finish',
        activity: activity.type,
        label: `Terminar ${lower}`,
        color: 'success',
        disabled: blocked,
        reason: blocked ? `Faltan ${missing} pieza(s)${which} por cortar` : undefined,
      },
      {
        kind: 'pause',
        activity: activity.type,
        label: `Pausar ${lower}`,
        color: 'secondary',
        outline: true,
      },
    ]
  }
  return []
}

// Process order, which is also the order the buttons read best in.
export const ACTIVITY_ORDER: ActivityType[] = ['cutting', 'banding', 'additional']

/** The order's applicable activities, in process order. */
export const orderedActivities = (activities: OrderActivity[] | undefined): OrderActivity[] =>
  ACTIVITY_ORDER.map((type) => findActivity(activities, type)).filter(
    (a): a is OrderActivity => !!a,
  )

/** Which activities a user's roles may register (their union), in process order. */
export const activitiesForRoles = (roles: readonly string[] | undefined): ActivityType[] =>
  ACTIVITY_ORDER.filter((type) => hasAnyRole(roles, ACTIVITY_ROLES[type]))
