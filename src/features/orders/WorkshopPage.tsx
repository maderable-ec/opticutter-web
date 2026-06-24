import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CProgressBar,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilArrowRight, cilCheckAlt, cilPrint } from '@coreui/icons'

import { useHasRole } from 'src/features/auth/useAuth'
import { PALETTE, pieceSig } from 'src/features/optimizer/cutDrawing'
import OrderStatusBadge from './OrderStatusBadge'
import BandingStatusBadge from './BandingStatusBadge'
import WorkshopBoardSvg from './WorkshopBoardSvg'
import { ordersApi } from './ordersApi'
import { useCuttingPlan, useMarkPiece, useOrder, useUpdateOrderStatus } from './useOrders'
import type { CutPiece, CutProgress } from './types'

const pct = ({ cutPieces, totalPieces }: CutProgress) =>
  totalPieces > 0 ? Math.round((cutPieces / totalPieces) * 100) : 0

const hasPending = ({ cutPieces, totalPieces }: CutProgress) => cutPieces < totalPieces

const isDone = ({ cutPieces, totalPieces }: CutProgress) =>
  totalPieces > 0 && cutPieces >= totalPieces

const WorkshopPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // El operador no tiene detalle de orden: vuelve al listado en vez de a /orders/:id.
  const isOperator = useHasRole('operador')
  const isAdminOrOperator = useHasRole('administrador', 'operador')

  const { data: plan, isLoading, isError, error } = useCuttingPlan(id, !!id)
  // El plan de corte no trae datos de canteado; traemos la orden para mostrar el chip (solo lectura).
  const { data: order } = useOrder(id)
  const markPiece = useMarkPiece(id ?? '')
  const updateStatus = useUpdateOrderStatus()

  const [cutModal, setCutModal] = useState(false)
  // Tablero en pantalla (uno a la vez). Se identifica por id persistente para sobrevivir a refetchs.
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // Color estable por firma de dimensión recorriendo todas las piezas de todos los tableros, para
  // que piezas iguales compartan color entre hojas (igual criterio que el optimizador).
  const colorFor = useMemo(() => {
    const colors = new Map<string, string>()
    for (const board of plan?.boards ?? []) {
      for (const p of board.pieces) {
        const sig = pieceSig(p)
        if (!colors.has(sig)) colors.set(sig, PALETTE[colors.size % PALETTE.length])
      }
    }
    return (sig: string) => colors.get(sig) ?? PALETTE[0]
  }, [plan])

  // Mantener el chip activo a la vista al cambiar de tablero (centrado horizontal, sin saltos verticales).
  // Los chips son los hijos directos de la tira, en el mismo orden que boards.
  useEffect(() => {
    if (!plan) return
    const idx = Math.max(
      0,
      plan.boards.findIndex((b) => b.id === selectedBoardId),
    )
    stripRef.current?.children[idx]?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [plan, selectedBoardId])

  const interactive = plan?.status === 'cutting'

  // Un clic solo marca; sobre una pieza ya cortada no hace nada (se desmarca con doble clic).
  const onPieceTap = (piece: CutPiece) => {
    if (!id || piece.cut) return
    markPiece.mutate({ pieceId: piece.id, cut: true })
  }

  // Doble clic = desmarcar, sin confirmación.
  const onPieceUntap = (piece: CutPiece) => {
    if (!id || !piece.cut) return
    markPiece.mutate({ pieceId: piece.id, cut: false })
  }

  const confirmCut = () => {
    if (!id) return
    updateStatus.mutate({ id, data: { status: 'cut' } }, { onSuccess: () => setCutModal(false) })
  }

  const backToOrder = () => navigate(isOperator ? '/orders' : `/orders/${id}`)

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <>
        <CButton variant="ghost" color="secondary" className="mb-3" onClick={backToOrder}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          {isOperator ? 'Volver a órdenes' : 'Volver a la orden'}
        </CButton>
        <CAlert color="danger">{error?.message || 'No se pudo cargar el plan de corte.'}</CAlert>
      </>
    )
  }

  const boards = plan.boards

  // Selección por defecto sin efecto: si la selección actual es inválida (inicio o tablero que ya no
  // existe tras un refetch), aterrizar en el primer tablero pendiente. Patrón de ajuste de estado en
  // render de React: converge (al fijar un id válido, la condición deja de cumplirse) y no auto-avanza
  // al completar un tablero, porque ese id sigue existiendo.
  if (selectedBoardId == null || !boards.some((b) => b.id === selectedBoardId)) {
    const fallback = (boards.find((b) => hasPending(b.progress)) ?? boards[0])?.id ?? null
    if (fallback !== selectedBoardId) setSelectedBoardId(fallback)
  }

  const safeIndex = Math.max(
    0,
    boards.findIndex((b) => b.id === selectedBoardId),
  )
  const current = boards[safeIndex]
  const goTo = (i: number) => setSelectedBoardId(boards[i].id)

  // Siguiente tablero con piezas pendientes (a partir del actual, con wrap), para el CTA "ir al siguiente".
  const pendingNext = (() => {
    for (let k = 1; k <= boards.length; k++) {
      const b = boards[(safeIndex + k) % boards.length]
      if (hasPending(b.progress)) return b
    }
    return null
  })()

  const header = (
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
      <CButton variant="ghost" color="secondary" size="lg" onClick={backToOrder}>
        <CIcon icon={cilArrowLeft} className="me-1" />
        {isOperator ? 'Volver a órdenes' : 'Volver a la orden'}
      </CButton>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <h4 className="mb-0">{plan.orderCode}</h4>
        <OrderStatusBadge status={plan.status} />
        {order?.bandingStatus && order.bandingStatus !== 'not_applicable' && (
          <BandingStatusBadge status={order.bandingStatus} />
        )}
      </div>
      <CButton
        color="secondary"
        variant="outline"
        size="lg"
        onClick={() => id && ordersApi.downloadProductionSheet(id)}
      >
        <CIcon icon={cilPrint} className="me-1" />
        Hoja de producción
      </CButton>
    </div>
  )

  if (boards.length === 0) {
    return (
      <>
        {header}
        <CAlert color="info">Esta orden no tiene tableros en su plan de corte.</CAlert>
      </>
    )
  }

  return (
    <>
      {header}

      {/* Controles pegajosos: avance total + selector de tablero, siempre a mano al cortar */}
      <div
        className="bg-body border-bottom mb-3 pt-2 pb-2 px-2"
        style={{ position: 'sticky', top: '4rem', zIndex: 1020 }}
      >
        <div className="d-flex align-items-center gap-3 mb-2">
          <strong className="text-nowrap">
            Total {plan.progress.cutPieces}/{plan.progress.totalPieces}
          </strong>
          <CProgress className="flex-grow-1" height={12}>
            <CProgressBar
              value={pct(plan.progress)}
              color={isDone(plan.progress) ? 'success' : 'primary'}
            />
          </CProgress>
          {isDone(plan.progress) && <span className="text-success fw-semibold">¡Completo!</span>}
        </div>

        {/* Tira de chips por tablero (scroll horizontal); tap = ir a ese tablero */}
        <div ref={stripRef} className="d-flex gap-2 overflow-auto pb-1">
          {boards.map((b, i) => {
            const active = b.id === current.id
            const done = isDone(b.progress)
            const color = done ? 'success' : b.progress.cutPieces > 0 ? 'primary' : 'secondary'
            return (
              <CButton
                key={b.id}
                color={color}
                variant={active ? undefined : 'outline'}
                className="d-flex flex-column align-items-center flex-shrink-0 px-3 py-2"
                style={{ minWidth: 96, lineHeight: 1.15 }}
                onClick={() => goTo(i)}
              >
                <span className="fw-semibold">Tablero {b.sheetNumber}</span>
                <span className="small">
                  {done ? '✓ Listo' : `${b.progress.cutPieces}/${b.progress.totalPieces}`}
                </span>
              </CButton>
            )
          })}
        </div>
      </div>

      {/* Cola de espera: el operador aún no tomó la orden */}
      {plan.status === 'queued' && isAdminOrOperator && (
        <CCard className="mb-3 border-primary">
          <CCardBody>
            <p className="mb-3">Esta orden está disponible para cortar.</p>
            <CButton
              color="primary"
              size="lg"
              className="w-100"
              disabled={updateStatus.isPending}
              onClick={() => id && updateStatus.mutate({ id, data: { status: 'cutting' } })}
            >
              {updateStatus.isPending ? <CSpinner size="sm" /> : 'Tomar esta orden'}
            </CButton>
            {updateStatus.error && (
              <div className="text-danger small mt-2">
                {updateStatus.error.message || 'Error al tomar la orden.'}
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {/* Cerrar el corte: habilitado solo cuando todas las piezas están marcadas. El API es la
          garantía real (422 si faltan piezas); deshabilitar es UX. Al pasar a 'cut', el plan se
          refresca y la vista queda en solo-lectura. */}
      {interactive && (
        <div className="mb-3">
          <CButton
            color="primary"
            size="lg"
            className="w-100"
            disabled={hasPending(plan.progress) || updateStatus.isPending}
            title={
              hasPending(plan.progress)
                ? `Faltan ${plan.progress.totalPieces - plan.progress.cutPieces} pieza(s) por cortar`
                : undefined
            }
            onClick={() => setCutModal(true)}
          >
            <CIcon icon={cilCheckAlt} className="me-1" />
            Marcar orden como cortada
          </CButton>
          {hasPending(plan.progress) && (
            <div className="text-warning small mt-2">
              Faltan {plan.progress.totalPieces - plan.progress.cutPieces} pieza(s) por cortar para
              habilitar el corte.
            </div>
          )}
          {updateStatus.error && (
            <div className="text-danger small mt-2">
              {updateStatus.error.message || 'Error al cambiar estado.'}
            </div>
          )}
        </div>
      )}

      {!interactive && plan.status !== 'queued' && (
        <div className="text-body-secondary small mb-3">
          Solo lectura: el corte ya fue completado.
        </div>
      )}
      {!interactive && plan.status === 'queued' && !isAdminOrOperator && (
        <div className="text-body-secondary small mb-3">
          Disponible en la cola. Toma la orden para empezar a cortar.
        </div>
      )}

      {markPiece.isError && (
        <CAlert color="danger" className="py-2">
          {markPiece.error?.message || 'No se pudo actualizar la pieza.'}
        </CAlert>
      )}

      {/* Tablero en foco (uno a la vez) */}
      <CCard className="mb-3">
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <strong>
                Tablero {current.sheetNumber} ({safeIndex + 1} de {boards.length}) —{' '}
                {current.progress.cutPieces}/{current.progress.totalPieces}
              </strong>
              <div className="text-body-secondary small">{current.productName}</div>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              <CButton
                color="secondary"
                variant="outline"
                size="lg"
                disabled={safeIndex === 0}
                title="Tablero anterior"
                onClick={() => goTo(safeIndex - 1)}
              >
                <CIcon icon={cilArrowLeft} />
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                size="lg"
                disabled={safeIndex === boards.length - 1}
                title="Tablero siguiente"
                onClick={() => goTo(safeIndex + 1)}
              >
                <CIcon icon={cilArrowRight} />
              </CButton>
            </div>
          </div>
          <CProgress height={8} className="mt-2">
            <CProgressBar
              value={pct(current.progress)}
              color={isDone(current.progress) ? 'success' : 'primary'}
            />
          </CProgress>
        </CCardHeader>
        <CCardBody>
          {/* CTA de baja fricción: al terminar un tablero, un toque para saltar al siguiente pendiente */}
          {!hasPending(current.progress) && pendingNext && (
            <CButton
              color="success"
              size="lg"
              className="w-100 mb-3"
              onClick={() => setSelectedBoardId(pendingNext.id)}
            >
              Tablero {current.sheetNumber} completo — Ir al siguiente pendiente (Tablero{' '}
              {pendingNext.sheetNumber}) →
            </CButton>
          )}
          <WorkshopBoardSvg
            key={current.id}
            board={current}
            colorFor={colorFor}
            interactive={!!interactive}
            onPieceTap={onPieceTap}
            onPieceUntap={onPieceUntap}
          />
        </CCardBody>
      </CCard>

      {/* Confirmar cierre del corte (orden → cortada) */}
      <CModal visible={cutModal} onClose={() => setCutModal(false)}>
        <CModalHeader>
          <CModalTitle>Marcar como cortada</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Marcar la orden <strong>{plan.orderCode}</strong> como <strong>cortada</strong>? Esto
          cierra el corte y la vista pasará a solo lectura.
          {updateStatus.error && (
            <div className="text-danger small mt-2">
              {updateStatus.error.message || 'Error al cambiar estado.'}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setCutModal(false)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={confirmCut} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? <CSpinner size="sm" /> : 'Confirmar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default WorkshopPage
