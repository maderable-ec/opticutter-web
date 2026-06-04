import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

import OrderStatusBadge from './OrderStatusBadge'
import { useAssociateInvoice, useOrder, useUpdateOrderStatus } from './useOrders'
import { ordersApi } from './ordersApi'

const TERMINAL_STATES = ['completed', 'cancelled', 'expired']

const STATUS_TRANSITIONS = {
  draft: [
    { to: 'quoted', label: 'Cotizar', color: 'primary' },
    { to: 'cancelled', label: 'Cancelar', color: 'danger' },
  ],
  quoted: [
    { to: 'confirmed', label: 'Confirmar', color: 'primary' },
    { to: 'cancelled', label: 'Cancelar', color: 'danger' },
  ],
  confirmed: [
    { to: 'approved', label: 'Aprobar', color: 'primary' },
    { to: 'cancelled', label: 'Cancelar', color: 'danger' },
  ],
  approved: [
    { to: 'in_production', label: 'Enviar a producción', color: 'primary' },
    { to: 'cancelled', label: 'Cancelar', color: 'danger' },
  ],
  in_production: [{ to: 'cut', label: 'Marcar como cortado', color: 'primary' }],
  cut: [{ to: 'completed', label: 'Marcar como completado', color: 'success' }],
}

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(n)
    : '—'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const isExpiringSoon = (expiresAt, status) => {
  if (!expiresAt || TERMINAL_STATES.includes(status)) return false
  const diff = new Date(expiresAt) - new Date()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
}

const clientName = (c) => [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.identifier || '—'

const OrderDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: order, isLoading } = useOrder(id)
  const updateStatus = useUpdateOrderStatus()
  const associateInvoice = useAssociateInvoice()

  const [transitionModal, setTransitionModal] = useState({ visible: false, transition: null })
  const [transitionNote, setTransitionNote] = useState('')
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [invoiceId, setInvoiceId] = useState('')

  const openTransition = (transition) => {
    setTransitionNote('')
    setTransitionModal({ visible: true, transition })
  }
  const closeTransition = () => {
    setTransitionModal({ visible: false, transition: null })
    updateStatus.reset()
  }

  const confirmTransition = () => {
    const { transition } = transitionModal
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
    associateInvoice.mutate(
      { id, data: { externalInvoiceId: invoiceId } },
      { onSuccess: closeInvoice },
    )
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

  const transitions = STATUS_TRANSITIONS[order.status] ?? []
  const isTerminal = TERMINAL_STATES.includes(order.status)
  const showDocuments = !['draft', 'expired'].includes(order.status)
  const expiringSoon = isExpiringSoon(order.expiresAt, order.status)

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
            </CCol>
            <CCol xs={12} md={6}>
              <div className="small">
                <div>
                  <span className="text-body-secondary">Creado:</span> {fmtDateTime(order.createdAt)}
                </div>
                {order.confirmedAt && (
                  <div>
                    <span className="text-body-secondary">Confirmado:</span> {fmtDateTime(order.confirmedAt)}
                  </div>
                )}
                {order.expiresAt && (
                  <div className={expiringSoon ? 'text-danger fw-semibold' : ''}>
                    <span className={expiringSoon ? 'text-danger' : 'text-body-secondary'}>Vence:</span>{' '}
                    {fmtDate(order.expiresAt)}
                    {expiringSoon && ' ⚠ Vence pronto'}
                  </div>
                )}
              </div>
            </CCol>
            <CCol xs={12}>
              <div className="fs-5 fw-semibold">Total: {fmt(order.total)}</div>
              {order.externalInvoiceId && (
                <div className="text-body-secondary small">
                  Factura: <strong>{order.externalInvoiceId}</strong>
                </div>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Status actions */}
      {!isTerminal && transitions.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Acciones</strong>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex gap-2 flex-wrap">
              {transitions.map((t) => (
                <CButton key={t.to} color={t.color} size="sm" onClick={() => openTransition(t)}>
                  {t.label}
                </CButton>
              ))}
            </div>
            {updateStatus.error && (
              <div className="text-danger small mt-2">
                {updateStatus.error.detail || 'Error al cambiar estado.'}
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
                  <CTableHeaderCell className="bg-body-tertiary">Tablero</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Qty tableros</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Precio unit.</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Total línea</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Eficiencia avg</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Área m²</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {order.lines.map((l) => (
                  <CTableRow key={l.id}>
                    <CTableDataCell>{l.boardName ?? '—'}</CTableDataCell>
                    <CTableDataCell>{l.boardCode ?? '—'}</CTableDataCell>
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
      {order.pieces?.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Lista de corte</strong>
          </CCardHeader>
          <CCardBody>
            <CTable small responsive hover>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Etiqueta</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Alto (mm)</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Ancho (mm)</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Cant.</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Prioridad</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-center">Puede rotar</CTableHeaderCell>
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
                    <CTableDataCell className="text-center">{p.canRotate ? 'Sí' : 'No'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}

      {/* History */}
      {order.history?.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Historial</strong>
          </CCardHeader>
          <CCardBody>
            <CTable small responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Desde</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Hacia</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Actor</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Nota</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Fecha</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {order.history.map((h) => (
                  <CTableRow key={h.id}>
                    <CTableDataCell>
                      {h.fromStatus ? <OrderStatusBadge status={h.fromStatus} /> : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <OrderStatusBadge status={h.toStatus} />
                    </CTableDataCell>
                    <CTableDataCell>{h.actor ?? '—'}</CTableDataCell>
                    <CTableDataCell>{h.note ?? '—'}</CTableDataCell>
                    <CTableDataCell className="text-nowrap">{fmtDateTime(h.createdAt)}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}

      {/* Documents & invoice */}
      {showDocuments && (
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
                onClick={() => ordersApi.downloadProforma(id)}
              >
                <CIcon icon={cilExternalLink} className="me-1" />
                Proforma PDF
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => ordersApi.downloadProductionSheet(id)}
              >
                <CIcon icon={cilExternalLink} className="me-1" />
                Hoja de producción PDF
              </CButton>
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                disabled={!!order.externalInvoiceId}
                onClick={() => setInvoiceModal(true)}
              >
                {order.externalInvoiceId ? 'Factura asociada' : 'Asociar factura'}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

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
              {updateStatus.error.detail || 'Error al cambiar estado.'}
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
              {associateInvoice.error.detail || 'Error al asociar la factura.'}
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
