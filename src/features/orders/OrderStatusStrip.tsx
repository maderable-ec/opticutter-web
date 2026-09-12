import { CAlert } from '@coreui/react'

import { fmtDateTime } from 'src/shared/utils/format'
import { ACTIVITY_LABEL, orderedActivities } from './activities'
import type { OrderActivity, OrderStatus } from './types'

// One line for "where is this order". It replaces four tinted cards — En corte, Canteado,
// Despachada, Forma de pago — that were stacked full-width above the content. Three of them are the
// same subject (how far along the order is) split by status, and on a dispatched order with edge
// banding all three were on screen at once, each costing a frame and a heading to say one sentence.
//
// The activities run in parallel under `in_process`: the cut can be done while the banding is
// still running. So the order's status is the sentence and the activities ride the same line on
// the right, the way the pre-order strip carries its review link. The full who/when trail of each
// one, the only thing the compression drops, stays reachable in the line's `title`.
//
// Payment is not here: it is not progress, it is money, and it now sits with the totals — the same
// reasoning that put the price level next to the totals in the wizard rather than on a toolbar.

interface OrderStatusStripProps {
  status: OrderStatus
  assignedToLabel?: string | null
  assignedAt?: string | null
  // No `dispatchedAt`: the identity block's date line owns every timestamp on this page.
  dispatchedByLabel?: string | null
  activities?: OrderActivity[]
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'secondary'

// One activity in a few words: "Canteado listo · Ana". `pending` names no actor because there
// is none yet.
const activityLine = (activity: OrderActivity): string => {
  const label = ACTIVITY_LABEL[activity.type]
  switch (activity.status) {
    case 'pending':
      return `${label} pendiente`
    case 'in_progress':
      return activity.startedByLabel
        ? `${label} en curso · ${activity.startedByLabel}`
        : `${label} en curso`
    case 'done':
      return activity.finishedByLabel
        ? `${label} listo · ${activity.finishedByLabel}`
        : `${label} listo`
  }
}

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

const OrderStatusStrip = ({
  status,
  assignedToLabel,
  assignedAt,
  dispatchedByLabel,
  activities,
}: OrderStatusStripProps) => {
  let tone: Tone = 'info'
  // Empty means "the badge already said it": with no banding track either, the strip renders
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
      // already say; the activities on the right carry the rest.
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
      <div className="d-flex flex-wrap align-items-center gap-2">
        {sentence && <span>{sentence}</span>}
        {work.length > 0 && (
          // `ms-auto` only when there is a sentence to be pushed away from; on their own the
          // activities are the line, not a note in its margin.
          <span
            className={
              sentence ? 'ms-auto opacity-75 d-flex flex-wrap gap-2' : 'd-flex flex-wrap gap-2'
            }
          >
            {work.map((activity) => (
              <span key={activity.type} title={activityTrail(activity)}>
                {activityLine(activity)}
              </span>
            ))}
          </span>
        )}
      </div>
    </CAlert>
  )
}

export default OrderStatusStrip
