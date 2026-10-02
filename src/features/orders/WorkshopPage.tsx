import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { CBadge, CButton, CProgress, CProgressBar } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import { useHasRole } from 'src/features/auth/useAuth'
import { usePrintLabel } from 'src/features/print/usePrint'
import { PALETTE, pieceSig } from 'src/shared/utils/cutDrawing'
import useFullscreen from 'src/shared/hooks/useFullscreen'
import { usePaging } from 'src/shared/hooks/usePaging'
import Pager from 'src/shared/components/Pager'
import { useBack } from 'src/shared/hooks/useShellNav'
import { useToastStore } from 'src/shared/store/toastStore'
import { MASK } from 'src/shared/analytics'
import AppToaster from 'src/shared/components/AppToaster'
import ReferenceNote from 'src/shared/components/ReferenceNote'
import { clientName } from 'src/shared/utils/format'
import OrderStatusBadge from './OrderStatusBadge'
import ActivityBadge from './ActivityBadge'
import { findActivity, orderedActivities } from './activities'
import WorkshopBoardSvg from './WorkshopBoardSvg'
import WorkshopBoardPicker from './WorkshopBoardPicker'
import BoardName from './BoardName'
import { cutBarColor, cutPct } from './progress'
import { useCuttingPlan, useMarkPiece, useUpdateActivity } from './useOrders'
import type { CutPiece, CutProgress } from './types'
import { ErrorState } from 'src/shared/components/QueryState'
import EmptyState from 'src/shared/components/EmptyState'
import Spinner from 'src/shared/components/Spinner'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'

const hasPending = ({ cutPieces, totalPieces }: CutProgress) => cutPieces < totalPieces

// The cutting canvas («Corte», in the Taller workspace) is the one screen in the app that owns the
// whole viewport: it runs on a tablet bolted next to the saw, where the only task is marking pieces
// cut and a scroll costs a gloved hand a second attempt. So it is a fixed three-row shell — top bar,
// diagram, one action — and the layout puts no header under it (`AppRoute.immersive`). It is sized
// to fit the smallest panel in the shop (960×544 CSS on the Infinix XPad, ~1080×735 on the iPad).
// The Fullscreen API sits ON TOP of that, hosted on the whole shell rather than on the diagram, and
// its only extra job is reclaiming the browser's own toolbar.
const WorkshopPage = () => {
  const { id } = useParams<{ id: string }>()
  // Back to where the canvas was opened from — the Taller's queue, or the order's detail — by the
  // shell's own rule (`returnFor`). Reached by its URL, the nearest page this viewer can open: the
  // order for the office, the queue for the operador, who cannot open `/orders`.
  const back = useBack()
  const isAdminOrOperator = useHasRole('administrador', 'operador')

  const { data: plan, isLoading, isError, error } = useCuttingPlan(id, !!id)
  const markPiece = useMarkPiece(id ?? '')
  const updateActivity = useUpdateActivity()
  const printLabel = usePrintLabel()
  const addToast = useToastStore((s) => s.addToast)

  const [cutModal, setCutModal] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Board currently on screen (one at a time). Identified by persistent id to survive refetches.
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null)

  const {
    containerRef,
    isFullscreen,
    isSupported: fullscreenSupported,
    toggle: toggleFullscreen,
  } = useFullscreen<HTMLDivElement>()
  // Modals must portal INSIDE the fullscreen host: document.body sits outside the fullscreen
  // element, so anything portaled there mounts but is never painted.
  const modalContainer = useCallback(() => containerRef.current, [containerRef])

  // The shell is fixed and covers everything, but the layout's `min-vh-100` wrapper is still behind
  // it — on iOS that rubber-bands under the fixed element. Locking the body is what makes "no
  // scroll" true rather than merely invisible.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // ← / → page between boards, the same as the `‹ ›` in the top bar and the swipe on the diagram,
  // for whoever reads the canvas on a desktop (the admin auditing a dispatched order). An open modal
  // (the board picker, the cut confirmation) owns the keyboard while it is up. The swipe is
  // `WorkshopBoardSvg`'s own, since only the drawing knows whether it is zoomed.
  const pagedBoards = plan?.boards ?? []
  const pagedIndex = pagedBoards.findIndex((b) => b.id === selectedBoardId)
  usePaging({
    index: pagedIndex < 0 ? null : pagedIndex,
    count: pagedBoards.length,
    onChange: (i) => setSelectedBoardId(pagedBoards[i]?.id ?? null),
    skipUnderModal: true,
  })

  // Stable color keyed by dimension signature across all boards, so identical pieces share
  // the same color across sheets (same logic as the optimizer).
  const colorFor = useMemo(() => {
    const colors = new Map<string, string>()
    for (const board of plan?.boards ?? []) {
      for (const p of board.pieces) {
        const sig = pieceSig(p)
        if (!colors.has(sig)) colors.set(sig, PALETTE[colors.size % PALETTE.length] ?? PALETTE[0])
      }
    }
    return (sig: string) => colors.get(sig) ?? PALETTE[0]
  }, [plan])

  // The order status can no longer answer this: `cutting` and `cut` are one state, so what
  // decides whether the canvas is live is the CUT's own status.
  const cutActivity = findActivity(plan?.activities, 'cutting')
  const interactive = cutActivity?.status === 'in_progress'

  // Single tap marks a piece as cut; tapping an already-cut piece does nothing (double-tap unmarks it).
  // Once the cut is confirmed server-side, dispatch its label to the branch's thermal printer —
  // skipped when the branch has no such printer (the backend would skip it anyway; not firing
  // keeps the cut from costing a pointless round trip on every single piece).
  //
  // Failures go to a toast rather than an alert on the page: an alert would push the layout that
  // exists precisely so nothing has to scroll.
  const onPieceTap = (piece: CutPiece) => {
    if (!id || piece.cut) return
    markPiece.mutate(
      { pieceId: piece.id, cut: true },
      {
        onSuccess: () => {
          if (plan?.printLabelsEnabled) printLabel.mutate({ orderId: id, pieceId: piece.id })
        },
        onError: (e) => addToast(e?.message || 'No se pudo marcar la pieza.', 'danger'),
      },
    )
  }

  // Double-tap = unmark, no confirmation required.
  const onPieceUntap = (piece: CutPiece) => {
    if (!id || !piece.cut) return
    markPiece.mutate(
      { pieceId: piece.id, cut: false },
      { onError: (e) => addToast(e?.message || 'No se pudo desmarcar la pieza.', 'danger') },
    )
  }

  // Starting the cut is also what takes the order out of the queue, and closing it is what
  // finishes the order when nothing else is pending -- both derived by the backend from this
  // one call, so the canvas makes one request either way.
  const changeCut = (status: 'in_progress' | 'done', onDone?: () => void) => {
    if (!id) return
    updateActivity.mutate(
      { id, activity: 'cutting', data: { status } },
      {
        onSuccess: () => onDone?.(),
        onError: (e) => addToast(e?.message || 'Error al registrar el corte.', 'danger'),
      },
    )
  }

  const goBack = back.go
  const backLabel = `Volver a ${back.name}`

  // Every state paints inside the shell, so the bar and the way back are there even while loading
  // or after a failure.
  const shell = (children: ReactNode) => (
    <div ref={containerRef} className="workshop-shell">
      {children}
      {/* Fullscreen renders only this subtree, and the layout's toaster sits outside it. */}
      {isFullscreen && <AppToaster />}
    </div>
  )

  if (isLoading) {
    return shell(
      <div className="d-flex align-items-center justify-content-center h-100">
        <Spinner color="secondary" visuallyHiddenLabel="Cargando el plan de corte…" />
      </div>,
    )
  }

  if (isError || !plan) {
    return shell(
      <div className="p-3">
        <CButton variant="ghost" color="secondary" size="lg" className="mb-3" onClick={goBack}>
          <Icon name="back" className="me-1" />
          {backLabel}
        </CButton>
        <ErrorState title="No se pudo cargar el plan de corte." hint={error?.message} />
      </div>,
    )
  }

  const boards = plan.boards

  // Default selection with no side effect: if the current selection is invalid (first render or board
  // removed after a refetch), fall back to the first pending board. React render-phase state adjustment
  // pattern: converges (once a valid id is set the condition stops being true) and does not auto-advance
  // when a board is completed, because its id still exists.
  if (selectedBoardId == null || !boards.some((b) => b.id === selectedBoardId)) {
    const fallback = (boards.find((b) => hasPending(b.progress)) ?? boards[0])?.id ?? null
    if (fallback !== selectedBoardId) setSelectedBoardId(fallback)
  }

  const safeIndex = Math.max(
    0,
    boards.findIndex((b) => b.id === selectedBoardId),
  )
  const current = boards[safeIndex]
  const goTo = (i: number) => setSelectedBoardId(boards[i]?.id ?? null)

  // Next board with pending pieces (starting from the current one, with wrap-around) for the "go to next" CTA.
  const pendingNext = (() => {
    for (let k = 1; k <= boards.length; k++) {
      const b = boards[(safeIndex + k) % boards.length]
      if (b && hasPending(b.progress)) return b
    }
    return null
  })()

  const topBar = (
    <div className="workshop-topbar">
      <CButton
        color="secondary"
        variant="ghost"
        size="lg"
        className="workshop-back"
        title={backLabel}
        aria-label={backLabel}
        onClick={goBack}
      >
        <Icon name="arrowLeft" size="lg" />
      </CButton>

      <div className="workshop-identity">
        <div className="workshop-identity__line">
          <strong className="text-nowrap">{plan.orderCode}</strong>
          <OrderStatusBadge status={plan.status} />
          {/* The parallel work, read-only: the operator does not register it, but seeing that
            the canteador is still on the order is what stops them asking. The plan carries the
            activities now, so this no longer costs a second request for the whole order. */}
          {orderedActivities(plan.activities)
            .filter((activity) => activity.type !== 'cutting')
            .map((activity) => (
              <span className="workshop-banding-badge" key={activity.type}>
                <ActivityBadge activity={activity} />
              </span>
            ))}
          {/* No "solo lectura" label: the status badge already says `Cortada`, the action bar is gone
            and the pieces carry no pointer affordance — a third copy only cost the width that
            truncated the badges next to it. */}
        </div>
        {/* Whose job is on the saw and which of their jobs, under its code: the client, then the
            reference. Its own line, so it keeps the whole width of the block at every size, and it
            wraps rather than truncating — on a phone the name lost its end, and the reference only
            showed from `xl`. A second line here costs the drawing nothing on a phone, where the
            sheet is bound by the width. No `title`, since touch panels have no hover. */}
        <div className="workshop-identity__who small lh-sm" {...MASK}>
          <span className="fw-semibold">{clientName(plan.client)}</span>
          <ReferenceNote notes={plan.notes} variant="inline" />
        </div>
      </div>

      {current && (
        <Pager
          index={safeIndex}
          count={boards.length}
          onChange={goTo}
          noun="Tablero"
          size="lg"
          className="workshop-pager"
          label={
            <CButton
              color="secondary"
              variant="outline"
              size="lg"
              className="workshop-pager__label"
              title="Ver todos los tableros"
              onClick={() => setPickerOpen(true)}
            >
              <span className="fw-semibold">Tablero {current.sheetNumber}</span>
              <span className="text-body-secondary">
                {/* Of how many boards: the first thing to go on a narrow panel, since `‹ ›` and the
                    picker already say there are others. In words, not as a second fraction — «2/3 ·
                    3/9» side by side read as two counts of the same thing. `sheetNumber` runs 1..N
                    across the order, so it is the position too. The cut count stays: it is the
                    reason to look at the label at all. */}
                <span className="d-none d-md-inline"> de {boards.length}</span> ·{' '}
                {current.progress.cutPieces}/{current.progress.totalPieces}
              </span>
            </CButton>
          }
        />
      )}

      <div className="workshop-total">
        <span className="fw-semibold text-nowrap">
          {plan.progress.cutPieces}/{plan.progress.totalPieces}
        </span>
        <CProgress height={8} className="workshop-total__bar">
          <CProgressBar value={cutPct(plan.progress)} color={cutBarColor(plan.progress)} />
        </CProgress>
      </div>

      {fullscreenSupported && (
        <CButton
          color="secondary"
          variant="outline"
          size="lg"
          className="workshop-fullscreen"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          onClick={toggleFullscreen}
        >
          <Icon name={isFullscreen ? 'exitFullscreen' : 'fullscreen'} />
        </CButton>
      )}
    </div>
  )

  if (boards.length === 0 || !current) {
    return shell(
      <>
        {topBar}
        <EmptyState title="Esta orden no tiene tableros en su plan de corte." />
      </>,
    )
  }

  const pendingCount = plan.progress.totalPieces - plan.progress.cutPieces
  // A board that is done while others are pending, and "everything is cut", are mutually exclusive:
  // `pendingNext` is null exactly when the order can be closed. So one primary action is enough.
  const nextTarget = !hasPending(current.progress) ? pendingNext : null

  let actionBar: ReactNode = null
  if (plan.status === 'queued') {
    actionBar = isAdminOrOperator ? (
      <CButton
        color="primary"
        size="lg"
        className="ms-auto"
        disabled={updateActivity.isPending}
        onClick={() => changeCut('in_progress')}
      >
        {updateActivity.isPending ? <Spinner size="sm" /> : 'Tomar esta orden'}
      </CButton>
    ) : (
      <span className="text-body-secondary">
        Disponible en la cola. Toma la orden para empezar a cortar.
      </span>
    )
  } else if (interactive) {
    actionBar = nextTarget ? (
      <CButton
        color="success"
        size="lg"
        className="ms-auto"
        onClick={() => setSelectedBoardId(nextTarget.id)}
      >
        Tablero {current.sheetNumber} completo — Ir al Tablero {nextTarget.sheetNumber} →
      </CButton>
    ) : (
      <>
        {pendingCount > 0 && (
          <span className="text-warning-emphasis">
            {pendingCount === 1 ? 'Falta 1 pieza' : `Faltan ${pendingCount} piezas`} por cortar
          </span>
        )}
        {/* The API is the authoritative guard (422 if pieces are missing); disabling is UX only. */}
        <CButton
          color="primary"
          size="lg"
          className="ms-auto"
          disabled={pendingCount > 0 || updateActivity.isPending}
          onClick={() => setCutModal(true)}
        >
          <Icon name="check" className="me-1" />
          Marcar orden como cortada
        </CButton>
      </>
    )
  }

  return shell(
    <>
      {topBar}

      <div className="workshop-stage-wrap">
        {/* Which physical board this is — the material to fetch from the rack — in full, on a row of
            its own between the bar and the drawing. It used to sit over the drawing's letterbox to
            cost no row, capped at 60% and truncated: on a 390px phone a third of a real catalogue
            name was gone, and on the panel a long one covered the board's corner. */}
        <div className="workshop-boardname">
          <Icon name="board" className="me-2" />
          <BoardName productName={current.productName} />
          {current.halfBoard && (
            <CBadge color="info" className="ms-2">
              ½ medio
            </CBadge>
          )}
        </div>
        <WorkshopBoardSvg
          key={current.id}
          board={current}
          colorFor={colorFor}
          interactive={!!interactive}
          onPieceTap={onPieceTap}
          onPieceUntap={onPieceUntap}
          onPrevBoard={safeIndex > 0 ? () => goTo(safeIndex - 1) : undefined}
          onNextBoard={safeIndex < boards.length - 1 ? () => goTo(safeIndex + 1) : undefined}
        />
      </div>

      {/* A read-only order has nothing to act on, so the bar goes and the diagram takes its height. */}
      {actionBar && <div className="workshop-actionbar">{actionBar}</div>}

      <WorkshopBoardPicker
        visible={pickerOpen}
        boards={boards}
        currentId={current.id}
        container={modalContainer}
        onSelect={(boardId) => {
          setSelectedBoardId(boardId)
          setPickerOpen(false)
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* Confirm cut close (order → cortada) */}
      <ConfirmDialog
        visible={cutModal}
        touch
        container={modalContainer}
        title={`Marcar ${plan.orderCode} como cortada`}
        confirmLabel="Marcar como cortada"
        pending={updateActivity.isPending}
        onConfirm={() => changeCut('done', () => setCutModal(false))}
        onClose={() => setCutModal(false)}
      >
        Esto cierra el corte y la vista pasa a solo lectura.
      </ConfirmDialog>
    </>,
  )
}

export default WorkshopPage
