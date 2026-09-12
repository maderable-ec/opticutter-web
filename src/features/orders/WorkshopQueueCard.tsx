import { CButton, CCard, CCardBody, CProgress, CProgressBar, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilBolt, cilCheckAlt, cilChevronRight, cilMediaPlay } from '@coreui/icons'

import ReferenceNote from 'src/shared/components/ReferenceNote'
import { relativeTime } from 'src/shared/utils/date'
import { fmtDateTime } from 'src/shared/utils/format'
import OrderStatusBadge from './OrderStatusBadge'
import ActivityBadge from './ActivityBadge'
import { ACTIVITY_LABEL, orderedActivities } from './activities'
import { activityClock, elapsedTone, queueStatusClock, TONE_CLASS } from './elapsed'
import { statusLabel } from './status'
import type { CardAction, WorkshopQueueItem } from './types'

const pct = ({ cutPieces, totalPieces }: WorkshopQueueItem['progress']) =>
  totalPieces > 0 ? Math.round((cutPieces / totalPieces) * 100) : 0

const isDone = ({ cutPieces, totalPieces }: WorkshopQueueItem['progress']) =>
  totalPieces > 0 && cutPieces >= totalPieces

// Default icon per kind: `activities.ts` derives the buttons and is deliberately icon-free.
const ACTION_ICON: Record<CardAction['kind'], string[]> = {
  take: cilMediaPlay,
  open: cilArrowRight,
  start: cilMediaPlay,
  finish: cilCheckAlt,
}

// Elapsed time comes from the shared rule in `elapsed.ts`, which the orders listing reads too.
// It escalates in stages (an hour, then four) instead of flipping once a day, and it keeps
// counting through `in_process` — being taken is not the same as being finished, and an order
// somebody took this morning and abandoned used to look exactly like one taken a minute ago.
//
// `queueStatusClock` is what preserves the one thing the old marker got right: a QUEUED card still
// measures from `queuedAt` (the moment the order was PAID, which is what gates `confirmed → queued`
// and what the board's FIFO sorts by), never from the status clock, which the admin rollback
// `in_process → queued` moves.

// One line of prose: "En corte hace 3 h", coloured by how late it is.
const ElapsedLine = ({ label, iso }: { label: string; iso: string | null }) =>
  iso ? (
    <div className={TONE_CLASS[elapsedTone(iso)]} title={fmtDateTime(iso)}>
      {label} {relativeTime(iso)}
    </div>
  ) : null

// One line standing in for the whole material list: how much there is to cut, and how much banding
// to run. A real order carries six boards and four banding lines; printing them all made the card
// taller than the queue it sits in. The count of DISTINCT products is deliberately not here — it
// changes no decision the board asks for; it belongs in the modal's totals row.
const materialsSummary = ({ boardUsage, bandingUsage }: WorkshopQueueItem): string => {
  const sheets = boardUsage.reduce((n, board) => n + board.count, 0)
  const meters = bandingUsage.reduce((m, banding) => m + banding.linearM, 0)
  const parts: string[] = []
  // "Planchas", the same noun the dialog's total uses: a half board is one sheet off the rack
  // but half a tablero on the bill, and the card must not contradict what it opens.
  if (sheets > 0) parts.push(`${sheets} ${sheets === 1 ? 'plancha' : 'planchas'}`)
  if (meters > 0) parts.push(`${meters.toFixed(1)} m de tapacanto`)
  return parts.join(' · ')
}

interface WorkshopQueueCardProps {
  item: WorkshopQueueItem
  // Head of the FIFO queue, computed by the page across every item.
  isNext: boolean
  // Already filtered by role and ordered by the page: this card renders what it is given.
  actions: CardAction[]
  // Scoped to THIS card: a shared mutation's `isPending` would freeze every card on the board.
  pending: boolean
  error: string | null
  onAction: (action: CardAction) => void
  onShowMaterials: () => void
}

const WorkshopQueueCard = ({
  item,
  isNext,
  actions,
  pending,
  error,
  onAction,
  onShowMaterials,
}: WorkshopQueueCardProps) => {
  const summary = materialsSummary(item)
  const activities = orderedActivities(item.activities)
  // Badges for the work only once the shop has actually started: on a queued card every
  // activity is pending and "Corte pendiente" says nothing the "En cola" badge does not.
  const showActivities = item.status === 'in_process'
  // The banding is the only activity whose piece set differs from the card's own bar
  // (`additional` runs over every piece, so its bar would be a duplicate).
  const banding = activities.find((a) => a.type === 'banding')
  // Only the first reason is shown: stacking three would push the card taller than the ones
  // beside it, and the shop acts on one button at a time.
  const blockedReason = actions.find((a) => a.reason)?.reason

  return (
    <CCard
      className="workshop-card h-100"
      data-status={item.status}
      data-priority={item.isPriority ? 'true' : undefined}
    >
      <CCardBody className="d-flex flex-column gap-3">
        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
          <div className="d-flex flex-column gap-1">
            {/* Two pills, not one: "Prioritaria" says WHY this card is up here, "Siguiente" says it
                is the one to take. On a prioritized head of queue both are true at once. */}
            {item.isPriority && (
              <span className="workshop-priority">
                <CIcon icon={cilBolt} className="workshop-priority__icon" />
                Prioritaria
              </span>
            )}
            {isNext && <span className="workshop-next">Siguiente</span>}
            <span className="fs-4 fw-bold">{item.orderCode ?? '—'}</span>
          </div>
          {/* Both tracks as plain badges. Each one names itself — the activity badge prints its
              track and draws its state as an icon, and the order's badge reads as the order's
              state — so a rubric over each one was scaffolding around something self-describing.
              The word the icon replaced is not lost here: the buttons below say it in finger
              size ("Iniciar canteado" / "Terminar canteado"). */}
          <div className="d-flex flex-wrap justify-content-end gap-1">
            <OrderStatusBadge status={item.status} />
            {showActivities &&
              activities.map((activity) => (
                <ActivityBadge key={activity.type} activity={activity} />
              ))}
          </div>
        </div>

        <div>
          <div className="fw-semibold">
            {item.client.firstName} {item.client.lastName}
          </div>
          {/* Reference (project/site): tells apart several orders of the same client. */}
          <ReferenceNote notes={item.notes} variant="header" />
        </div>

        {/* The whole line is the target, not a link at its end: on a touch panel the row is the
            control. What it opens is the one thing the summary cannot say — WHICH materials. */}
        {summary && (
          <button type="button" className="usage-summary" onClick={onShowMaterials}>
            <span>
              <span className="usage-label d-block">Materiales</span>
              <span className="fw-semibold">{summary}</span>
            </span>
            <CIcon icon={cilChevronRight} className="usage-summary__chevron" />
          </button>
        )}

        {item.progress.totalPieces > 0 && (
          <div className="d-flex align-items-center gap-3">
            <CProgress className="flex-grow-1">
              <CProgressBar
                value={pct(item.progress)}
                color={isDone(item.progress) ? 'success' : 'primary'}
              />
            </CProgress>
            <span className="fw-semibold text-nowrap">
              {item.progress.cutPieces}/{item.progress.totalPieces} piezas
            </span>
          </div>
        )}

        {/* The banded pieces get their own bar because they are their own gate: the bander
            waits on THESE, not on the cut as a whole. Without it the card would grey out the
            banding button while the bar above happily advances on pieces that carry no canto. */}
        {banding?.progress && banding.progress.totalPieces > 0 && (
          <div className="d-flex align-items-center gap-3">
            <CProgress className="flex-grow-1">
              <CProgressBar
                value={pct(banding.progress)}
                color={isDone(banding.progress) ? 'success' : 'info'}
              />
            </CProgress>
            <span className="fw-semibold text-nowrap">
              {banding.progress.cutPieces}/{banding.progress.totalPieces} con canto
            </span>
          </div>
        )}

        <div className="d-flex flex-column">
          <ElapsedLine label={statusLabel(item.status)} iso={queueStatusClock(item)} />
          {/* One clock per activity. Silent while an activity is blocked (nothing of its own
              cut yet) and once it is done — the two states where nobody is late. */}
          {showActivities &&
            activities.map((activity) => (
              <ElapsedLine
                key={activity.type}
                label={ACTIVITY_LABEL[activity.type]}
                iso={activityClock(activity)}
              />
            ))}
        </div>

        <div className="d-flex gap-2 mt-auto flex-wrap">
          {actions.map((action) => (
            <CButton
              key={`${action.kind}:${action.activity ?? ''}`}
              color={action.color}
              size="lg"
              className="flex-fill"
              disabled={action.disabled || pending}
              title={action.title}
              onClick={() => onAction(action)}
            >
              {pending ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={action.icon ?? ACTION_ICON[action.kind]} className="me-1" />
              )}
              {action.label}
            </CButton>
          ))}
        </div>

        {/* Why a button is greyed out, as text: this runs on a touch panel, where the
            `title=` tooltip above never fires. */}
        {blockedReason && <div className="text-body-secondary small">{blockedReason}</div>}
        {error && <div className="text-danger small">{error}</div>}
      </CCardBody>
    </CCard>
  )
}

export default WorkshopQueueCard
