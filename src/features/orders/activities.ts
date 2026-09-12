import { cilCheckAlt, cilClock, cilMediaPlay } from '@coreui/icons'

import type { ActivityStatus, ActivityType, CardAction, OrderActivity } from './types'

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
// cuts; the canteador bands and does the additional work.
export const ACTIVITY_ROLES: Record<ActivityType, string[]> = {
  cutting: ['administrador', 'operador'],
  banding: ['administrador', 'canteador'],
  additional: ['administrador', 'canteador'],
}

// Badge copy per activity and status. `pending` reads as "waiting", not as a problem: an
// activity is pending for as long as the shop has not reached it. The word is no longer
// PRINTED (see the icon below), but it stays here: it is the tooltip and the accessible text.
const STATUS_WORD: Record<ActivityStatus, string> = {
  pending: 'pendiente',
  in_progress: 'en curso',
  done: 'listo',
}

const STATUS_COLOR: Record<ActivityStatus, string> = {
  pending: 'secondary',
  in_progress: 'warning',
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
 * play triangle and a check are three different silhouettes; a `cilSync`-style circle was
 * rejected for `in_progress` because at this size it is the same blob as the clock.
 */
const STATUS_ICON: Record<ActivityStatus, string[]> = {
  pending: cilClock,
  in_progress: cilMediaPlay,
  done: cilCheckAlt,
}

export interface ActivityBadgeConfig {
  color: string
  icon: string[]
  /** The track's name — the only text the badge prints. */
  label: string
  /** The word the icon stands for. Not printed; read by the tooltip and by a screen reader. */
  statusWord: string
}

export const activityBadge = (activity: OrderActivity): ActivityBadgeConfig => ({
  color: STATUS_COLOR[activity.status],
  icon: STATUS_ICON[activity.status],
  label: ACTIVITY_LABEL[activity.type],
  statusWord: STATUS_WORD[activity.status],
})

export const findActivity = (
  activities: OrderActivity[] | undefined,
  type: ActivityType,
): OrderActivity | undefined => activities?.find((a) => a.type === type)

export const isDone = (activity: OrderActivity | undefined) => activity?.status === 'done'

/**
 * The button an activity offers right now, or `null` when it offers none.
 *
 * Mirrors the backend's floors so the card can say WHY it is greyed out instead of
 * bouncing the tap: starting needs one piece of the activity's own set cut, finishing needs
 * them all — except `additional`, which the canteador closes on their own word. The button
 * stays on screen and disables: on a shop-floor panel, an action that silently disappears is
 * indistinguishable from a bug.
 */
export const activityAction = (activity: OrderActivity): CardAction | null => {
  const label = ACTIVITY_LABEL[activity.type]
  const progress = activity.progress ?? { cutPieces: 0, totalPieces: 0 }
  const missing = progress.totalPieces - progress.cutPieces

  if (activity.status === 'pending') {
    // The cut is its own floor: it IS the cutting, so nothing has to be cut first.
    const blocked = activity.type !== 'cutting' && progress.cutPieces === 0
    return {
      kind: 'start',
      activity: activity.type,
      label: `Iniciar ${label.toLowerCase()}`,
      color: 'primary',
      disabled: blocked,
      reason: blocked
        ? activity.type === 'banding'
          ? 'Falta cortar la primera pieza con canto'
          : 'Falta cortar la primera pieza'
        : undefined,
    }
  }
  if (activity.status === 'in_progress') {
    const blocked = activity.type !== 'additional' && missing > 0
    return {
      kind: 'finish',
      activity: activity.type,
      label: `Terminar ${label.toLowerCase()}`,
      color: 'success',
      disabled: blocked,
      reason: blocked
        ? activity.type === 'banding'
          ? `Faltan ${missing} pieza(s) con canto por cortar`
          : `Faltan ${missing} pieza(s) por cortar`
        : undefined,
    }
  }
  return null
}

// Process order, which is also the order the buttons read best in.
export const ACTIVITY_ORDER: ActivityType[] = ['cutting', 'banding', 'additional']

/** The order's applicable activities, in process order. */
export const orderedActivities = (activities: OrderActivity[] | undefined): OrderActivity[] =>
  ACTIVITY_ORDER.map((type) => findActivity(activities, type)).filter(
    (a): a is OrderActivity => !!a,
  )

/** Which activities a role may register, in process order. */
export const activitiesForRole = (role: string | undefined): ActivityType[] =>
  role ? ACTIVITY_ORDER.filter((type) => ACTIVITY_ROLES[type].includes(role)) : []
