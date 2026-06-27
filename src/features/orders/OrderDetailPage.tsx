import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilExternalLink } from '@coreui/icons'

import type { Client } from 'src/features/clients/types'
import { useCurrentUser, useHasRole } from 'src/features/auth/useAuth'
import StatusHistoryCard from 'src/shared/components/StatusHistoryCard'
import PricingBlock from 'src/shared/components/PricingBlock'
import type { PricingData } from 'src/features/optimizer/types'
import OrderStatusBadge from './OrderStatusBadge'
import BandingStatusBadge from './BandingStatusBadge'
import { useAssociateInvoice, useCuttingPlan, useOrder, useUpdateOrderStatus } from './useOrders'
import { ordersApi } from './ordersApi'
import type { OrderStatus } from './types'

interface StatusTransition {
  to: OrderStatus
  label: string
  color: string
  roles: string[]
}

const TERMINAL_STATES: OrderStatus[] = ['despachado', 'cancelled']

// Estados donde el plan de corte es relevante: en cola (interactivo en el taller) y posteriores
// (solo-lectura, auditoría de lo cortado).
const WORKSHOP_STATES: OrderStatus[] = ['queued', 'cutting', 'cut', 'completed']

const STATUS_TRANSITIONS: Partial<Record<OrderStatus, StatusTransition[]>> = {
  confirmed: [
    {
      to: 'queued',
      label: 'Poner en cola',
      color: 'primary',
      roles: ['administrador', 'vendedor'],
    },
    { to: 'cancelled', label: 'Cancelar', color: 'danger', roles: ['administrador', 'vendedor'] },
  ],
  queued: [
    { to: 'cutting', label: 'Tomar orden', color: 'primary', roles: ['administrador', 'operador'] },
  ],
  cutting: [
    {
      to: 'cut',
      label: 'Marcar como cortada',
      color: 'primary',
      roles: ['administrador', 'operador'],
    },
    { to: 'queued', label: 'Regresar a cola', color: 'secondary', roles: ['administrador'] },
  ],
  cut: [
    {
      to: 'completed',
      label: 'Marcar como completada',
      color: 'success',
      roles: ['administrador', 'vendedor'],
    },
  ],
  completed: [
    {
      to: 'despachado',
      label: 'Despachar',
      color: 'success',
      roles: ['administrador', 'vendedor', 'operador', 'canteador'],
    },
  ],
}

const fmt = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(n) : '—'

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const clientName = (c?: Client) =>
  [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.identifier || '—'

interface TransitionModalState {
  visible: boolean
  transition: StatusTransition | null
}

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // Operador puede ver la orden, el documento y el plan de corte, pero no cambiar estado ni facturar.
  const canManage = useHasRole('administrador', 'vendedor')
  // El operador no usa el detalle: su flujo es el taller. Lo redirigimos allí (también por URL directa).
  const isOperator = useHasRole('operador')

  const currentUser = useCurrentUser()
  const { data: order, isLoading } = useOrder(id)
  const cuttingPlan = useCuttingPlan(id, !!order && WORKSHOP_STATES.includes(order.status))
  const updateStatus = useUpdateOrderStatus()
  const associateInvoice = useAssociateInvoice()

  const [transitionModal, setTransitionModal] = useState<TransitionModalState>({
    visible: false,
    transition: null,
  })
  const [transitionNote, setTransitionNote] = useState('')
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [invoiceId, setInvoiceId] = useState('')

  const openTransition = (transition: StatusTransition) => {
    setTransitionNote('')
    setTransitionModal({ visible: true, transition })
  }
  const closeTransition = () => {
    setTransitionModal({ visible: false, transition: null })
    updateStatus.reset()
  }

  const confirmTransition = () => {
    const { transition } = transitionModal
    if (!id || !transition) return
    updateStatus.mutate(
      { id, data: { status: transition.to, note: transitionNote || undefined } },
      { onSuccess: closeTransition },
    )
  }

  const closeInvoice = () => {
    setInvoiceModal(false)
    setInvoiceId('')
    associateInvoice.reset()
  }
  const confirmInvoice = () => {
    if (!id) return
    associateInvoice.mutate(
      { id, data: { externalInvoiceId: invoiceId } },
      { onSuccess: closeInvoice },
    )
  }

  if (isOperator) {
    return <Navigate to={`/orders/${id}/workshop`} replace />
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!order) {
    return <CAlert color="danger">Orden no encontrada.</CAlert>
  }

  const transitions = (STATUS_TRANSITIONS[order.status] ?? []).filter((t) =>
    t.roles.includes(currentUser?.role ?? ''),
  )
  const isTerminal = TERMINAL_STATES.includes(order.status)

  const plan = cuttingPlan.data
  const showProduction = WORKSHOP_STATES.includes(order.status)
  const piecesPending = plan ? plan.progress.totalPieces - plan.progress.cutPieces : 0
  // El API es la garantía (responde 422 si faltan piezas); deshabilitar el botón es solo UX.
  const cutGated = order.status === 'cutting' && !!plan && piecesPending > 0
  const planPct =
    plan && plan.progress.totalPieces > 0
      ? Math.round((plan.progress.cutPieces / plan.progress.totalPieces) * 100)
      : 0
  const planDone =
    !!plan && plan.progress.totalPieces > 0 && plan.progress.cutPieces >= plan.progress.totalPieces

  // Canteado: bloque visible si la orden lleva tapacantos. El cierre (cut → completed) queda
  // bloqueado mientras el canteado siga pendiente/en progreso (el API responde 422; deshabilitar es UX).
  const showBanding = !!order.bandingStatus && order.bandingStatus !== 'not_applicable'
  const bandingPending = order.bandingStatus === 'pending' || order.bandingStatus === 'in_progress'

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton variant="ghost" color="secondary" size="sm" onClick={() => navigate('/orders')}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          Volver
        </CButton>
      </div>

      {/* Header */}
      <CCard className="mb-3">
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h5 className="mb-0">{order.code ?? 'Sin código'}</h5>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="text-body-secondary small">
                Cliente: <strong>{clientName(order.client)}</strong> (@{order.client?.identifier})
              </div>
              {canManage && (
                <div className="text-body-secondary small">
                  Sucursal: <strong>{order.branch.name}</strong>
                  {order.branch.code && <span> ({order.branch.code})</span>}
                </div>
              )}
            </CCol>
            <CCol xs={12} md={6}>
              <div className="small">
                <div>
                  <span className="text-body-secondary">Creado:</span>{' '}
                  {fmtDateTime(order.createdAt)}
                </div>
                {order.confirmedAt && (
                  <div>
                    <span className="text-body-secondary">Confirmado:</span>{' '}
                    {fmtDateTime(order.confirmedAt)}
                  </div>
                )}
              </div>
            </CCol>
            <CCol xs={12}>
              {order.subtotal != null && order.priceTierCode ? (
                <PricingBlock
                  pricing={
                    {
                      priceTierCode: order.priceTierCode,
                      priceTierName: order.priceTierName ?? order.priceTierCode,
                      discountRate: order.discountRate ?? 0,
                      discountBase: order.subtotal,
                      subtotal: order.subtotal,
                      discountAmount: order.discountAmount ?? 0,
                      total: order.total,
                    } satisfies PricingData
                  }
                />
              ) : (
                <div className="fs-5 fw-semibold">Total: {fmt(order.total)}</div>
              )}
              {order.externalInvoiceId && (
                <div className="text-body-secondary small">
                  Factura: <strong>{order.externalInvoiceId}</strong>
                </div>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Asignación del operador (cutting en curso o auditoría post-cut) */}
      {(order.status === 'cutting' || order.status === 'cut') && order.assignedToLabel && (
        <CCard className="mb-3 border-warning">
          <CCardBody className="bg-warning bg-opacity-10 py-2">
            <div className="fw-semibold text-warning-emphasis mb-1">En corte</div>
            <div className="small">
              <span className="text-body-secondary">Operador:</span>{' '}
              <strong>{order.assignedToLabel}</strong>
            </div>
            {order.assignedAt && (
              <div className="small">
                <span className="text-body-secondary">Desde:</span> {fmtDateTime(order.assignedAt)}
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {/* Canteado — pista paralela al corte. Se oculta si la orden no lleva tapacantos. */}
      {showBanding && (
        <CCard className="mb-3 border-info">
          <CCardBody className="bg-info bg-opacity-10 py-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="fw-semibold text-info-emphasis">Canteado</span>
              <BandingStatusBadge status={order.bandingStatus!} />
            </div>
            {order.bandingStartedByLabel && (
              <div className="small">
                <span className="text-body-secondary">Inició:</span>{' '}
                <strong>{order.bandingStartedByLabel}</strong>
                {order.bandingStartedAt && <span> · {fmtDateTime(order.bandingStartedAt)}</span>}
              </div>
            )}
            {order.bandingFinishedByLabel && (
              <div className="small">
                <span className="text-body-secondary">Terminó:</span>{' '}
                <strong>{order.bandingFinishedByLabel}</strong>
                {order.bandingFinishedAt && <span> · {fmtDateTime(order.bandingFinishedAt)}</span>}
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {/* Despacho — congelado al transicionar a despachado */}
      {order.status === 'despachado' && (
        <CCard className="mb-3 border-success">
          <CCardBody className="bg-success bg-opacity-10 py-2">
            <div className="fw-semibold text-success-emphasis mb-1">Despachada</div>
            {order.dispatchedByLabel && (
              <div className="small">
                <span className="text-body-secondary">Despachado por:</span>{' '}
                <strong>{order.dispatchedByLabel}</strong>
              </div>
            )}
            {order.dispatchedAt && (
              <div className="small">
                <span className="text-body-secondary">Fecha:</span>{' '}
                {fmtDateTime(order.dispatchedAt)}
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {/* Status actions */}
      {!isTerminal && transitions.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Acciones</strong>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex gap-2 flex-wrap">
              {transitions.map((t) => {
                const cutBlocked = t.to === 'cut' && cutGated
                const bandingBlocked = t.to === 'completed' && bandingPending
                const blocked = cutBlocked || bandingBlocked
                const title = cutBlocked
                  ? `Faltan ${piecesPending} pieza(s) por cortar`
                  : bandingBlocked
                    ? 'Falta terminar el canteado'
                    : undefined
                return (
                  <CButton
                    key={t.to}
                    color={t.color}
                    size="sm"
                    disabled={blocked}
                    title={title}
                    onClick={() => openTransition(t)}
                  >
                    {t.label}
                  </CButton>
                )
              })}
            </div>
            {cutGated && (
              <div className="text-warning small mt-2">
                Faltan {piecesPending} pieza(s) por cortar. Marcalas en el taller para habilitar el
                corte.
              </div>
            )}
            {bandingPending && transitions.some((t) => t.to === 'completed') && (
              <div className="text-warning small mt-2">
                Falta terminar el canteado para poder completar la orden.
              </div>
            )}
            {updateStatus.error && (
              <div className="text-danger small mt-2">
                {updateStatus.error.message || 'Error al cambiar estado.'}
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {/* Producción / Taller */}
      {showProduction && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Producción</strong>
          </CCardHeader>
          <CCardBody>
            {cuttingPlan.isLoading ? (
              <CSpinner size="sm" />
            ) : plan ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">
                    {plan.progress.cutPieces} de {plan.progress.totalPieces} piezas cortadas
                  </span>
                  <span className="text-body-secondary small">{plan.boards.length} tablero(s)</span>
                </div>
                <CProgress className="mb-3" height={12}>
                  <CProgressBar value={planPct} color={planDone ? 'success' : 'primary'} />
                </CProgress>
                <CButton color="primary" onClick={() => navigate(`/orders/${id}/workshop`)}>
                  {order.status === 'queued' || order.status === 'cutting'
                    ? 'Abrir taller'
                    : 'Ver corte'}
                </CButton>
              </>
            ) : (
              <div className="text-body-secondary small">
                {cuttingPlan.error?.message || 'No se pudo cargar el plan de corte.'}
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {/* Lines */}
      {order.lines?.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Líneas de cobro</strong>
          </CCardHeader>
          <CCardBody>
            <CTable small responsive hover>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Producto</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Cant.</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Precio unit.
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Total línea
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Eficiencia avg
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Área m²</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {order.lines.map((l) => (
                  <CTableRow key={l.id}>
                    <CTableDataCell>{l.productName ?? '—'}</CTableDataCell>
                    <CTableDataCell>{l.productCode ?? '—'}</CTableDataCell>
                    <CTableDataCell className="text-end">{l.quantity}</CTableDataCell>
                    <CTableDataCell className="text-end">{fmt(l.unitPriceSnapshot)}</CTableDataCell>
                    <CTableDataCell className="text-end">{fmt(l.lineTotal)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {l.avgEfficiency != null ? `${l.avgEfficiency.toFixed(1)}%` : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {l.totalAreaM2 != null ? `${l.totalAreaM2.toFixed(3)} m²` : '—'}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}

      {/* Pieces */}
      {order.pieces && order.pieces.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Lista de corte</strong>
          </CCardHeader>
          <CCardBody>
            <CTable small responsive hover>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Etiqueta</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Alto (mm)
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Ancho (mm)
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Cant.</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">
                    Prioridad
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-center">
                    Puede rotar
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {order.pieces.map((p) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell>{p.label ?? '—'}</CTableDataCell>
                    <CTableDataCell className="text-end">{p.height}</CTableDataCell>
                    <CTableDataCell className="text-end">{p.width}</CTableDataCell>
                    <CTableDataCell className="text-end">{p.quantity}</CTableDataCell>
                    <CTableDataCell className="text-end">{p.priority}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      {p.canRotate ? 'Sí' : 'No'}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}

      {/* History — autor (actorLabel) + tipo de actor (badge); ver StatusHistoryCard. */}
      <StatusHistoryCard
        entries={order.history ?? []}
        renderStatus={(s) => <OrderStatusBadge status={s as OrderStatus} />}
      />

      {/* Documents & invoice — las órdenes nacen confirmadas, siempre tienen documentos. */}
      <CCard className="mb-3">
        <CCardHeader>
          <strong>Documentos y factura</strong>
        </CCardHeader>
        <CCardBody>
          <div className="d-flex gap-2 flex-wrap">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => id && ordersApi.downloadOrderDocument(id)}
            >
              <CIcon icon={cilExternalLink} className="me-1" />
              Orden de pedido PDF
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => id && ordersApi.downloadProductionSheet(id)}
            >
              <CIcon icon={cilExternalLink} className="me-1" />
              Hoja de producción PDF
            </CButton>
            {order.status === 'despachado' && (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => id && ordersApi.downloadDispatchSheet(id)}
              >
                <CIcon icon={cilExternalLink} className="me-1" />
                Hoja de despacho PDF
              </CButton>
            )}
            {canManage && (
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                disabled={!!order.externalInvoiceId}
                onClick={() => setInvoiceModal(true)}
              >
                {order.externalInvoiceId ? 'Factura asociada' : 'Asociar factura'}
              </CButton>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* Transition confirmation modal */}
      <CModal visible={transitionModal.visible} onClose={closeTransition}>
        <CModalHeader>
          <CModalTitle>Confirmar acción</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            ¿Confirmar: <strong>{transitionModal.transition?.label}</strong>?
          </p>
          <CFormLabel>Nota (opcional)</CFormLabel>
          <CFormTextarea
            rows={2}
            maxLength={512}
            value={transitionNote}
            onChange={(e) => setTransitionNote(e.target.value)}
            placeholder="Motivo o comentario…"
          />
          {updateStatus.error && (
            <div className="text-danger small mt-2">
              {updateStatus.error.message || 'Error al cambiar estado.'}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeTransition}>
            Cancelar
          </CButton>
          <CButton
            color={transitionModal.transition?.color ?? 'primary'}
            onClick={confirmTransition}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? <CSpinner size="sm" /> : 'Confirmar'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Invoice modal */}
      <CModal visible={invoiceModal} onClose={closeInvoice}>
        <CModalHeader>
          <CModalTitle>Asociar factura externa</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel>ID de factura</CFormLabel>
          <CFormInput
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            maxLength={64}
            placeholder="FAC-2026-0001"
          />
          {associateInvoice.error && (
            <div className="text-danger small mt-2">
              {associateInvoice.error.message || 'Error al asociar la factura.'}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeInvoice}>
            Cancelar
          </CButton>
          <CButton
            color="primary"
            onClick={confirmInvoice}
            disabled={associateInvoice.isPending || !invoiceId.trim()}
          >
            {associateInvoice.isPending ? <CSpinner size="sm" /> : 'Asociar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default OrderDetailPage
