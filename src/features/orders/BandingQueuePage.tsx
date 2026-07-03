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
  CRow,
  CSpinner,
} from '@coreui/react'
import { cilCheckAlt, cilMediaPlay } from '@coreui/icons'
import { useBandingQueue, useUpdateBanding } from './useOrders'
import { useState } from 'react'

import type { BandingQueueItem } from './types'
import BandingStatusBadge from './BandingStatusBadge'
import CIcon from '@coreui/icons-react'

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

// Touch-first view for the canteador: queue list with one contextual button per order.
// No prices or pieces — just the order code, client name, and boards for physical identification.
const BandingQueuePage = () => {
  const { data: items = [], isLoading, error } = useBandingQueue()
  const updateBanding = useUpdateBanding()
  const pendingId = updateBanding.isPending ? updateBanding.variables?.id : undefined
  const [confirmItem, setConfirmItem] = useState<BandingQueueItem | null>(null)

  const advance = (item: BandingQueueItem) => {
    const next = item.bandingStatus === 'pending' ? 'in_progress' : 'done'
    updateBanding.mutate({ id: String(item.orderId), data: { status: next } })
  }

  const confirmAdvance = () => {
    if (!confirmItem) return
    advance(confirmItem)
    setConfirmItem(null)
  }

  return (
    <CCard>
      <CCardBody>
        <h4 className="mb-3">Cola de canteado</h4>

        {isLoading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : error ? (
          <CAlert color="danger">
            {error.message || 'No se pudo cargar la cola de canteado.'}
          </CAlert>
        ) : items.length === 0 ? (
          <div className="text-center text-body-secondary py-5">No hay órdenes en cola.</div>
        ) : (
          <CRow className="g-3">
            {items.map((item) => {
              const isStart = item.bandingStatus === 'pending'
              const busy = pendingId === String(item.orderId)
              const failed =
                updateBanding.isError && updateBanding.variables?.id === String(item.orderId)
              return (
                <CCol key={item.orderId} xs={12} md={6} xl={4}>
                  <CCard className="h-100">
                    <CCardBody className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <span className="fs-4 fw-bold">{item.orderCode}</span>
                        <BandingStatusBadge status={item.bandingStatus} />
                      </div>
                      <div className="fw-semibold">
                        {item.client.firstName} {item.client.lastName}
                      </div>
                      {item.boardNames.length > 0 && (
                        <div className="d-flex flex-wrap gap-1">
                          {item.boardNames.map((name) => (
                            <span
                              key={name}
                              className="badge bg-secondary-subtle text-body-secondary"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-body-secondary small">
                        En cola desde {fmtDateTime(item.createdAt)}
                      </div>
                      <CButton
                        color={isStart ? 'primary' : 'success'}
                        size="lg"
                        className="w-100 mt-auto"
                        disabled={busy}
                        onClick={() => setConfirmItem(item)}
                      >
                        {busy ? (
                          <CSpinner size="sm" />
                        ) : (
                          <>
                            <CIcon icon={isStart ? cilMediaPlay : cilCheckAlt} className="me-1" />
                            {isStart ? 'Iniciar canteado' : 'Terminar canteado'}
                          </>
                        )}
                      </CButton>
                      {failed && (
                        <div className="text-danger small">
                          {updateBanding.error?.message || 'No se pudo actualizar el canteado.'}
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              )
            })}
          </CRow>
        )}
      </CCardBody>

      <CModal visible={!!confirmItem} onClose={() => setConfirmItem(null)}>
        <CModalHeader>
          <CModalTitle>Confirmar acción</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            ¿{confirmItem?.bandingStatus === 'pending' ? 'Iniciar' : 'Terminar'} el canteado de la
            orden <strong>{confirmItem?.orderCode}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setConfirmItem(null)}>
            Cancelar
          </CButton>
          <CButton
            color={confirmItem?.bandingStatus === 'pending' ? 'primary' : 'success'}
            onClick={confirmAdvance}
          >
            Confirmar
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default BandingQueuePage
