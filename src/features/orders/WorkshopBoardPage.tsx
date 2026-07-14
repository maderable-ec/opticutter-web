// Shared card-grid board for the production floor: multi-order queue for operador (cutting) and
// canteador (banding), plus administrador. NOT to be confused with:
//   - WorkshopPage.tsx        → single order's cutting canvas, at /orders/:id/workshop
//   - WorkshopBoardSvg.tsx    → SVG renderer for ONE physical board/sheet within that canvas
// This file (WorkshopBoardPage) is the multi-order dashboard at /workshop-board.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCheckAlt, cilMediaPlay } from '@coreui/icons'

import { useHasRole } from 'src/features/auth/useAuth'
import { usePrintConsolidated } from 'src/features/print/usePrint'
import OrderStatusBadge from './OrderStatusBadge'
import BandingStatusBadge from './BandingStatusBadge'
import { useUpdateBanding, useUpdateOrderStatus, useWorkshopQueue } from './useOrders'
import type { CutProgress, WorkshopQueueItem } from './types'

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const pct = ({ cutPieces, totalPieces }: CutProgress) =>
  totalPieces > 0 ? Math.round((cutPieces / totalPieces) * 100) : 0

const isDone = ({ cutPieces, totalPieces }: CutProgress) =>
  totalPieces > 0 && cutPieces >= totalPieces

type BoardAction = 'take' | 'complete' | 'startBanding' | 'finishBanding'

interface ConfirmState {
  kind: BoardAction
  item: WorkshopQueueItem
}

const ACTION_COPY: Record<BoardAction, { verb: string; color: 'primary' | 'success' }> = {
  take: { verb: 'Tomar', color: 'primary' },
  complete: { verb: 'Completar', color: 'success' },
  startBanding: { verb: 'Iniciar el canteado de', color: 'primary' },
  finishBanding: { verb: 'Terminar el canteado de', color: 'success' },
}

interface CardAction {
  kind: BoardAction
  label: string
  color: 'primary' | 'success'
  icon: string[]
  disabled?: boolean
  title?: string
  nav?: boolean
}

const WorkshopBoardPage = () => {
  const navigate = useNavigate()
  const { data: items = [], isLoading, error } = useWorkshopQueue()
  const updateStatus = useUpdateOrderStatus()
  const updateBanding = useUpdateBanding()
  const printConsolidated = usePrintConsolidated()
  const canOperate = useHasRole('administrador', 'operador')
  const canBand = useHasRole('administrador', 'canteador')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const runAction = (kind: BoardAction, item: WorkshopQueueItem) => {
    const id = String(item.orderId)
    if (kind === 'take') updateStatus.mutate({ id, data: { status: 'cutting' } })
    // On completion, dispatch the consolidated sheet to the branch's inkjet. Every role that can
    // complete from this board (operador/canteador/admin) also holds `orders:workshop`.
    else if (kind === 'complete')
      updateStatus.mutate(
        { id, data: { status: 'completed' } },
        { onSuccess: () => printConsolidated.mutate({ orderId: id }) },
      )
    else if (kind === 'startBanding') updateBanding.mutate({ id, data: { status: 'in_progress' } })
    else if (kind === 'finishBanding') updateBanding.mutate({ id, data: { status: 'done' } })
  }

  const confirmAction = () => {
    if (!confirm) return
    runAction(confirm.kind, confirm.item)
    setConfirm(null)
  }

  return (
    <CCard>
      <CCardBody>
        <h4 className="mb-3">Tablero de taller</h4>

        {isLoading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : error ? (
          <CAlert color="danger">
            {error.message || 'No se pudo cargar el tablero de taller.'}
          </CAlert>
        ) : items.length === 0 ? (
          <div className="text-center text-body-secondary py-5">No hay órdenes en el tablero.</div>
        ) : (
          <CRow className="g-3">
            {items.map((item) => {
              const bandingBlocked =
                item.bandingStatus === 'pending' || item.bandingStatus === 'in_progress'
              const showBanding = item.bandingStatus !== 'not_applicable'
              const idStr = String(item.orderId)

              let operatorAction: CardAction | null = null
              if (canOperate) {
                if (item.status === 'queued') {
                  operatorAction = {
                    kind: 'take',
                    label: 'Tomar',
                    color: 'primary',
                    icon: cilMediaPlay,
                  }
                } else if (item.status === 'cutting') {
                  operatorAction = {
                    kind: 'complete',
                    label: 'Abrir taller',
                    color: 'primary',
                    icon: cilArrowRight,
                    nav: true,
                  }
                } else if (item.status === 'cut') {
                  operatorAction = {
                    kind: 'complete',
                    label: 'Completar',
                    color: 'success',
                    icon: cilCheckAlt,
                    disabled: bandingBlocked,
                    title: bandingBlocked ? 'Falta terminar el canteado' : undefined,
                  }
                }
              }

              let bandingAction: CardAction | null = null
              if (canBand) {
                if (
                  (item.status === 'cutting' || item.status === 'cut') &&
                  item.bandingStatus === 'pending'
                ) {
                  bandingAction = {
                    kind: 'startBanding',
                    label: 'Iniciar canteado',
                    color: 'primary',
                    icon: cilMediaPlay,
                  }
                } else if (
                  (item.status === 'cutting' || item.status === 'cut') &&
                  item.bandingStatus === 'in_progress'
                ) {
                  bandingAction = {
                    kind: 'finishBanding',
                    label: 'Terminar canteado',
                    color: 'success',
                    icon: cilCheckAlt,
                  }
                } else if (
                  item.status === 'cut' &&
                  (item.bandingStatus === 'done' || item.bandingStatus === 'not_applicable')
                ) {
                  bandingAction = {
                    kind: 'complete',
                    label: 'Completar',
                    color: 'success',
                    icon: cilCheckAlt,
                  }
                }
              }

              // Dedupe: administrador with both gates on the same order shouldn't see two
              // identical "Completar" buttons.
              if (operatorAction && bandingAction && operatorAction.kind === bandingAction.kind) {
                bandingAction = null
              }

              const statusError =
                updateStatus.isError && updateStatus.variables?.id === idStr
                  ? updateStatus.error?.message || 'No se pudo actualizar la orden.'
                  : null
              const bandingError =
                updateBanding.isError && updateBanding.variables?.id === idStr
                  ? updateBanding.error?.message || 'No se pudo actualizar el canteado.'
                  : null

              return (
                <CCol key={item.orderId} xs={12} md={6} xl={4}>
                  <CCard className="h-100">
                    <CCardBody className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                        <span className="fs-4 fw-bold">{item.orderCode ?? '—'}</span>
                        <div className="d-flex gap-1">
                          <OrderStatusBadge status={item.status} />
                          {showBanding && <BandingStatusBadge status={item.bandingStatus} />}
                        </div>
                      </div>
                      <div className="fw-semibold">
                        {item.client.firstName} {item.client.lastName}
                      </div>
                      {item.boardUsage.length > 0 && (
                        <div className="d-flex flex-wrap gap-1">
                          {item.boardUsage.map((board) => (
                            <span
                              key={board.name}
                              className="badge bg-secondary-subtle text-body-secondary"
                            >
                              {board.count}× {board.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.bandingUsage.length > 0 && (
                        <div className="d-flex flex-wrap align-items-center gap-1">
                          <span className="text-body-secondary small">Tapacantos:</span>
                          {item.bandingUsage.map((banding) => (
                            <span
                              key={banding.name}
                              className="badge bg-info-subtle text-info-emphasis"
                            >
                              {banding.name} — {banding.linearM.toFixed(1)} m
                            </span>
                          ))}
                        </div>
                      )}
                      {item.progress.totalPieces > 0 && (
                        <div>
                          <CProgress className="mb-1">
                            <CProgressBar
                              value={pct(item.progress)}
                              color={isDone(item.progress) ? 'success' : 'primary'}
                            />
                          </CProgress>
                          <div className="text-body-secondary small">
                            {item.progress.cutPieces}/{item.progress.totalPieces} piezas cortadas
                          </div>
                        </div>
                      )}
                      <div className="text-body-secondary small">
                        En cola desde {fmtDateTime(item.createdAt)}
                      </div>

                      <div className="d-flex gap-2 mt-auto">
                        {operatorAction && (
                          <CButton
                            color={operatorAction.color}
                            className="flex-fill"
                            disabled={operatorAction.disabled || updateStatus.isPending}
                            title={operatorAction.title}
                            onClick={() => {
                              if (operatorAction.nav)
                                void navigate(`/orders/${item.orderId}/workshop`)
                              else setConfirm({ kind: operatorAction.kind, item })
                            }}
                          >
                            <CIcon icon={operatorAction.icon} className="me-1" />
                            {operatorAction.label}
                          </CButton>
                        )}
                        {bandingAction && (
                          <CButton
                            color={bandingAction.color}
                            className="flex-fill"
                            disabled={updateBanding.isPending}
                            onClick={() => setConfirm({ kind: bandingAction.kind, item })}
                          >
                            <CIcon icon={bandingAction.icon} className="me-1" />
                            {bandingAction.label}
                          </CButton>
                        )}
                      </div>
                      {statusError && <div className="text-danger small">{statusError}</div>}
                      {bandingError && <div className="text-danger small">{bandingError}</div>}
                    </CCardBody>
                  </CCard>
                </CCol>
              )
            })}
          </CRow>
        )}
      </CCardBody>

      <CModal visible={!!confirm} onClose={() => setConfirm(null)}>
        <CModalHeader>
          <CModalTitle>Confirmar acción</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            ¿{confirm && ACTION_COPY[confirm.kind].verb} la orden{' '}
            <strong>{confirm?.item.orderCode}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setConfirm(null)}>
            Cancelar
          </CButton>
          <CButton
            color={confirm ? ACTION_COPY[confirm.kind].color : 'primary'}
            onClick={confirmAction}
          >
            Confirmar
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default WorkshopBoardPage
