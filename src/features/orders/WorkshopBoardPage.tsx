// Shared card-grid board for the production floor: multi-order queue for operador (cutting) and
// canteador (banding), plus administrador. NOT to be confused with:
//   - WorkshopPage.tsx        → single order's cutting canvas, at /orders/:id/workshop
//   - WorkshopBoardSvg.tsx    → SVG renderer for ONE physical board/sheet within that canvas
// This file (WorkshopBoardPage) is the multi-order dashboard at /workshop-board.
//
// It is the landing page of `operador` and `canteador` (permissions.ts) — the only screen those two
// roles have — and it runs on a shop-floor touch panel: controls are `lg`, and nothing may depend on
// a hover (a `title=` says nothing there). It carries no page chrome of its own, like every other
// screen since the optimizer: the breadcrumb and the sidebar already name it, and a card wrapping a
// grid of cards only draws a second border.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCol,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import { useCurrentUser } from 'src/features/auth/useAuth'
import PrintJobsPanel from 'src/features/print/PrintJobsPanel'
import WorkshopQueueCard from './WorkshopQueueCard'
import WorkshopMaterialsModal from './WorkshopMaterialsModal'
import { useUpdateActivity, useWorkshopQueue } from './useOrders'
import {
  ACTIVITY_LABEL,
  activitiesForRole,
  activityAction,
  findActivity,
  orderedActivities,
} from './activities'
import type { ActivityType, BoardAction, CardAction, WorkshopQueueItem } from './types'

interface ConfirmState {
  action: CardAction
  item: WorkshopQueueItem
}

// What the confirm dialog says. `start`/`finish` name the activity, which the dialog gets from
// the action itself -- with three activities a fixed sentence per kind would say "Iniciar la
// orden" for three different jobs.
const ACTION_COPY: Record<
  BoardAction,
  { verb: string; label: string; color: 'primary' | 'success' }
> = {
  take: { verb: 'Tomar', label: 'Tomar', color: 'primary' },
  open: { verb: 'Abrir', label: 'Abrir taller', color: 'primary' },
  start: { verb: 'Iniciar', label: 'Iniciar', color: 'primary' },
  finish: { verb: 'Terminar', label: 'Terminar', color: 'success' },
}

// The sentence in the confirm dialog: "¿Terminar el canteado de la orden ORD-...?"
const confirmSentence = (action: BoardAction, activity?: ActivityType): string => {
  const verb = ACTION_COPY[action].verb
  if (!activity) return `${verb} la orden`
  return `${verb} el ${ACTIVITY_LABEL[activity].toLowerCase()} de la orden`
}

// Head of the queue: the next order to be taken. Derived here rather than trusting the endpoint's
// order, so the "Siguiente" pill stays true whatever it decides to sort by — but it must apply the
// SAME rule the endpoint does, or the pill lands on a card that isn't the first one: a prioritized
// order wins, and among equals the one that reached the shop first does. Only `queued`: once someone
// has taken an order it is nobody's "next".
//
// "Reached the shop" is `queuedAt` — when the order was PAID — not `createdAt`. An order is quoted
// and then waits for payment, so a quote raised first is often paid last; ranking by creation gave
// the next slot to whoever asked first instead of whoever paid first.
const arrivedAt = (item: WorkshopQueueItem): number =>
  new Date(item.queuedAt ?? item.createdAt).getTime()

const isAheadOf = (candidate: WorkshopQueueItem, head: WorkshopQueueItem): boolean => {
  if (candidate.isPriority !== head.isPriority) return candidate.isPriority
  return arrivedAt(candidate) < arrivedAt(head)
}

const nextOrderId = (items: WorkshopQueueItem[]): number | null => {
  let head: WorkshopQueueItem | null = null
  for (const item of items) {
    if (item.status !== 'queued') continue
    if (!head || isAheadOf(item, head)) head = item
  }
  return head?.orderId ?? null
}

const WorkshopBoardPage = () => {
  const navigate = useNavigate()
  const { data: items = [], isLoading, error } = useWorkshopQueue()
  const updateActivity = useUpdateActivity()
  // Which activities this viewer may register at all (ACTIVITY_ROLES, mirrored from the API).
  const allowed = activitiesForRole(useCurrentUser()?.role)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  // One dialog for the whole board rather than one per card: only one can be open at a time, and it
  // pages through the queue. State is the ORDER ID, not the index the dialog's API speaks: the queue
  // polls, so an index would keep pointing at a slot after the order in it was completed elsewhere —
  // silently showing a different order's materials.
  const [materialsId, setMaterialsId] = useState<number | null>(null)
  const materialsIndex = items.findIndex((item) => item.orderId === materialsId)

  const nextId = useMemo(() => nextOrderId(items), [items])

  const runAction = (action: CardAction, item: WorkshopQueueItem) => {
    const id = String(item.orderId)
    // Taking an order and opening it are one act, not two: `Tomar` is tapped because the cut is
    // about to start, and going back to the queue to find the same card and tap `Abrir taller` was
    // a second gesture with a glove on. Starting the cut is ALSO what takes the order out of the
    // queue -- the order's status is derived from the activity -- so this is one request, not two.
    // Navigate only on success: a rejected start (someone else took the order first) has to leave
    // the operator on the board, looking at the error.
    if (action.kind === 'take') {
      updateActivity.mutate(
        { id, activity: 'cutting', data: { status: 'in_progress' } },
        { onSuccess: () => void navigate(`/orders/${item.orderId}/workshop`) },
      )
      return
    }
    if (!action.activity) return
    updateActivity.mutate({
      id,
      activity: action.activity,
      data: { status: action.kind === 'start' ? 'in_progress' : 'done' },
    })
  }

  const confirmAction = () => {
    if (!confirm) return
    runAction(confirm.action, confirm.item)
    setConfirm(null)
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <PrintJobsPanel />

      {error ? (
        <CAlert color="danger">{error.message || 'No se pudo cargar el tablero de taller.'}</CAlert>
      ) : items.length === 0 ? (
        <div className="text-center text-body-secondary py-5">No hay órdenes en el tablero.</div>
      ) : (
        <CRow className="g-3">
          {items.map((item) => {
            const idStr = String(item.orderId)
            // One button per activity this viewer may register, derived in `activities.ts`
            // from the activity's own status and piece progress -- including its blocked
            // reason, so the card can grey out and SAY why instead of bouncing the tap.
            const actions: CardAction[] = orderedActivities(item.activities)
              .filter((activity) => allowed.includes(activity.type))
              .map((activity) => activityAction(activity))
              .filter((action): action is CardAction => action !== null)
              // Starting the cut of a QUEUED order is `take`: it also takes the order out of
              // the queue and opens the canvas, which is one gesture on a touch panel.
              .map((action) =>
                action.kind === 'start' && action.activity === 'cutting' && item.status === 'queued'
                  ? { ...action, kind: 'take', label: 'Tomar' }
                  : action,
              )

            // Once the cut is running, the operator's way back into the canvas.
            if (
              item.status === 'in_process' &&
              allowed.includes('cutting') &&
              findActivity(item.activities, 'cutting')?.status === 'in_progress'
            ) {
              actions.unshift({
                kind: 'open',
                label: 'Abrir taller',
                color: 'primary',
                nav: true,
              })
            }

            // The pending and error states are scoped to the card that acted: the mutation is
            // shared by the whole page, so an unscoped `isPending` froze the buttons of every
            // other order on the board while one request was in flight.
            const acting = updateActivity.variables?.id === idStr
            const error =
              updateActivity.isError && acting
                ? updateActivity.error?.message || 'No se pudo registrar el trabajo.'
                : null

            return (
              <CCol key={item.orderId} xs={12} md={6} xxl={4}>
                <WorkshopQueueCard
                  item={item}
                  isNext={item.orderId === nextId}
                  actions={actions}
                  pending={updateActivity.isPending && acting}
                  error={error}
                  onAction={(action) => {
                    if (action.nav) void navigate(`/orders/${item.orderId}/workshop`)
                    else setConfirm({ action, item })
                  }}
                  onShowMaterials={() => setMaterialsId(item.orderId)}
                />
              </CCol>
            )
          })}
        </CRow>
      )}

      <WorkshopMaterialsModal
        items={items}
        index={materialsIndex < 0 ? null : materialsIndex}
        onIndexChange={(next) => setMaterialsId(items[next]?.orderId ?? null)}
        onClose={() => setMaterialsId(null)}
      />

      <CModal visible={!!confirm} onClose={() => setConfirm(null)}>
        <CModalHeader>
          <CModalTitle>Confirmar acción</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0 fs-5">
            ¿{confirm && confirmSentence(confirm.action.kind, confirm.action.activity)}{' '}
            <strong>{confirm?.item.orderCode}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" size="lg" onClick={() => setConfirm(null)}>
            Cancelar
          </CButton>
          {/* The verb, not a generic "Confirmar": on a touch panel the button you are about to press
              should say what it does. */}
          <CButton
            color={confirm ? ACTION_COPY[confirm.action.kind].color : 'primary'}
            size="lg"
            onClick={confirmAction}
          >
            {confirm ? ACTION_COPY[confirm.action.kind].label : 'Confirmar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default WorkshopBoardPage
