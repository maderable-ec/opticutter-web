import { CAlert } from '@coreui/react'

import { fmtDateTime } from 'src/shared/utils/format'
import ActivityBadge from './ActivityBadge'
import ElapsedNote from './ElapsedNote'
import { activityClock } from './elapsed'
import { orderedActivities } from './activities'
import type { OrderActivity, OrderStatus } from './types'

// One line for "where is this order". It replaces four tinted cards — En corte, Canteado,
// Despachada, Forma de pago — that were stacked full-width above the content. Three of them are the
// same subject (how far along the order is) split by status, and on a dispatched order with edge
// banding all three were on screen at once, each costing a frame and a heading to say one sentence.
//
// The activities run in parallel under `in_process`: the cut can be done while the banding is
// still running. So the order's status is the sentence and the activities ride right under it —
// this is the one place the office reads to know who still owes work, and `in_process` alone
// cannot say it ("En proceso" reads the same with the cut just started and with it finished
// waiting on the canteador).
//
// They used to be plain 12px text at `opacity-75`, which is what made them invisible on the page
// that exists to be read. They now use the same three parts the listing's Actividades column and
// the shop-floor card already use — `ActivityBadge` (track + state as an icon), `ElapsedNote`
// (how long, coloured by how late) and the actor — because a rule about who is late is not a
// thing to draw three different ways.
//
// Payment is not here: it is not progress, it is money, and it now sits with the totals — the same
// reasoning that put the price level next to the totals in the wizard rather than on a toolbar.

interface OrderStatusStripProps {
  status: OrderStatus
  assignedToLabel?: string | null
  assignedAt?: string | null
  // No `dispatchedAt`: the identity block's date line owns every timestamp on this page.
  dispatchedByLabel?: string | null
  /**
   * Prefer the cutting plan's copy over the order's own: `GET /orders/{id}` serializes these
   * rows straight from the table and leaves `progress` null (each count would be a query per
   * row), while `GET /orders/{id}/cutting-plan` fills it — and the detail page already asks
   * for that endpoint. Without progress the strip simply omits the counts.
   */
  activities?: OrderActivity[]
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'secondary'

// `fmtDateTime` renders "09/08/2026, 09:20 a. m." — it already ends in a period, so a full stop
// appended after a date reads as "a. m..".
const endSentence = (s: string) => (s.endsWith('.') ? s : `${s}.`)

// The detail the one-liner leaves out, on hover.
const activityTrail = (activity: OrderActivity): string | undefined => {
  const parts: string[] = []
  if (activity.startedAt) parts.push(`Inició ${fmtDateTime(activity.startedAt)}`)
  if (activity.finishedAt) parts.push(`Terminó ${fmtDateTime(activity.finishedAt)}`)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

// Who has it. `pending` names nobody because there is nobody yet.
const actorOf = (activity: OrderActivity): string | null =>
  (activity.status === 'done' ? activity.finishedByLabel : activity.startedByLabel) ?? null

const OrderStatusStrip = ({
  status,
  assignedToLabel,
  assignedAt,
  dispatchedByLabel,
  activities,
}: OrderStatusStripProps) => {
  let tone: Tone = 'info'
  // Empty means "the badge already said it": with no activity track either, the strip renders
  // nothing rather than restating the status in a full-width block.
  let sentence = ''

  switch (status) {
    case 'confirmed':
      // Nothing has happened to this order yet.
      break
    case 'queued':
      sentence = 'En cola. Esperando que el taller la tome.'
      break
    case 'in_process':
    // Legacy statuses, only reachable on an order cut before the activities existed.
    case 'cutting':
    case 'cut':
      tone = 'warning'
      // Who has it and since when. With neither recorded there is nothing here the badge does not
      // already say; the activities below carry the rest.
      sentence =
        assignedToLabel || assignedAt
          ? endSentence(
              `En proceso${assignedToLabel ? ` por ${assignedToLabel}` : ''}` +
                `${assignedAt ? ` desde ${fmtDateTime(assignedAt)}` : ''}`,
            )
          : ''
      break
    case 'finished':
      tone = 'success'
      sentence = 'Terminada. Lista para despacho.'
      break
    case 'dispatched':
      tone = 'success'
      // Only who: the identity block's date line already carries "Despachada {fecha}", and the two
      // sit one on top of the other.
      sentence = dispatchedByLabel ? `Despachada por ${dispatchedByLabel}.` : ''
      break
    case 'cancelled':
      tone = 'secondary'
      sentence = 'Orden cancelada.'
      break
  }

  const work = orderedActivities(activities)

  if (!sentence && work.length === 0) return null

  return (
    <CAlert color={tone} className="py-2 small mb-3">
      {sentence && <div className={work.length > 0 ? 'mb-2' : undefined}>{sentence}</div>}
      {work.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-3">
          {work.map((activity) => {
            const progress = activity.progress
            const actor = actorOf(activity)
            return (
              <div
                key={activity.type}
                className="d-flex align-items-center gap-2"
                title={activityTrail(activity)}
              >
                <ActivityBadge activity={activity} />
                {/* The colour rides on this text and never on the badge, whose palette already
                    means the activity's own state. Note the amber tone is quieter here than on
                    the listing — it sits on the amber alert of an order in process — while the
                    red one, which is the signal that matters, still reads. Neither is the only
                    carrier: the note says the number. */}
                <ElapsedNote iso={activityClock(activity)} />
                {progress && progress.totalPieces > 0 && (
                  <span className="text-nowrap">
                    {progress.cutPieces}/{progress.totalPieces} piezas
                  </span>
                )}
                {actor && <span className="opacity-75 text-nowrap">{actor}</span>}
              </div>
            )
          })}
        </div>
      )}
    </CAlert>
  )
}

export default OrderStatusStrip
