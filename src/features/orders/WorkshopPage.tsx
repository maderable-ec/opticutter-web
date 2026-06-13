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
import { cilArrowLeft, cilArrowRight } from '@coreui/icons'

import { PALETTE, pieceSig } from 'src/features/optimizer/cutDrawing'
import OrderStatusBadge from './OrderStatusBadge'
import WorkshopBoardSvg from './WorkshopBoardSvg'
import { useCuttingPlan, useMarkPiece } from './useOrders'
import type { CutPiece, CutProgress } from './types'

const pct = ({ cutPieces, totalPieces }: CutProgress) =>
  totalPieces > 0 ? Math.round((cutPieces / totalPieces) * 100) : 0

const hasPending = ({ cutPieces, totalPieces }: CutProgress) => cutPieces < totalPieces

const isDone = ({ cutPieces, totalPieces }: CutProgress) =>
  totalPieces > 0 && cutPieces >= totalPieces

const WorkshopPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: plan, isLoading, isError, error } = useCuttingPlan(id, !!id)
  const markPiece = useMarkPiece(id ?? '')

  const [undoPiece, setUndoPiece] = useState<CutPiece | null>(null)
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

  const interactive = plan?.status === 'in_production'

  const onPieceTap = (piece: CutPiece) => {
    if (!id) return
    if (piece.cut) {
      setUndoPiece(piece) // deshacer requiere confirmación
    } else {
      markPiece.mutate({ pieceId: piece.id, cut: true })
    }
  }

  const confirmUndo = () => {
    if (undoPiece) markPiece.mutate({ pieceId: undoPiece.id, cut: false })
    setUndoPiece(null)
  }

  const backToOrder = () => navigate(`/orders/${id}`)

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
          Volver a la orden
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
        Volver a la orden
      </CButton>
      <div className="d-flex align-items-center gap-2">
        <h4 className="mb-0">{plan.orderCode}</h4>
        <OrderStatusBadge status={plan.status} />
      </div>
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

      {!interactive && (
        <div className="text-body-secondary small mb-3">
          Solo lectura: la orden ya no está en producción.
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
          />
        </CCardBody>
      </CCard>

      {/* Confirmar deshacer corte */}
      <CModal visible={!!undoPiece} onClose={() => setUndoPiece(null)}>
        <CModalHeader>
          <CModalTitle>Deshacer corte</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Marcar la pieza <strong>{undoPiece?.label}</strong> ({undoPiece?.originalWidth}×
          {undoPiece?.originalHeight} mm) como <strong>no cortada</strong>?
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setUndoPiece(null)}>
            Cancelar
          </CButton>
          <CButton color="warning" onClick={confirmUndo}>
            Deshacer
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default WorkshopPage
