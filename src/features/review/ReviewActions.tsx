import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CAlert,
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import { useConfirmReview, useRejectReview, useRequestChangesReview } from './useReview'

interface ReviewActionsProps {
  token: string
}

const ReviewActions = ({ token }: ReviewActionsProps) => {
  const qc = useQueryClient()
  const confirm = useConfirmReview(token)
  const reject = useRejectReview(token)
  const requestChanges = useRequestChangesReview(token)

  const [rejectModal, setRejectModal] = useState(false)
  const [changesModal, setChangesModal] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [changesNote, setChangesNote] = useState('')

  const closeReject = () => {
    const hadError = !!reject.error
    setRejectModal(false)
    setRejectNote('')
    reject.reset()
    if (hadError) void qc.invalidateQueries({ queryKey: ['review', token] })
  }

  const closeChanges = () => {
    const hadError = !!requestChanges.error
    setChangesModal(false)
    setChangesNote('')
    requestChanges.reset()
    if (hadError) void qc.invalidateQueries({ queryKey: ['review', token] })
  }

  const anyPending = confirm.isPending || reject.isPending || requestChanges.isPending

  return (
    <>
      {confirm.error && (
        <CAlert color="danger" className="py-2 small">
          {confirm.error.message || 'No se pudo confirmar. Intenta de nuevo.'}
        </CAlert>
      )}
      <div className="d-flex gap-2 flex-wrap">
        <CButton color="primary" disabled={anyPending} onClick={() => confirm.mutate(undefined)}>
          {confirm.isPending ? <CSpinner size="sm" /> : 'Confirmar pedido'}
        </CButton>
        <CButton
          color="warning"
          variant="outline"
          disabled={anyPending}
          onClick={() => setChangesModal(true)}
        >
          Solicitar cambios
        </CButton>
        <CButton
          color="secondary"
          variant="outline"
          disabled={anyPending}
          onClick={() => setRejectModal(true)}
        >
          Rechazar
        </CButton>
      </div>

      {/* Request changes modal */}
      <CModal visible={changesModal} onClose={closeChanges}>
        <CModalHeader>
          <CModalTitle>Solicitar cambios</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>Indica qué ajustes necesitas en la cotización. El taller recibirá tu nota.</p>
          <CFormLabel>¿Qué quieres cambiar? (opcional)</CFormLabel>
          <CFormTextarea
            rows={3}
            maxLength={512}
            value={changesNote}
            onChange={(e) => setChangesNote(e.target.value)}
            placeholder="Ej: cambia las dimensiones de la pieza 2, agrega barniz…"
          />
          {requestChanges.error && (
            <div className="text-danger small mt-2">
              {requestChanges.error.message || 'No se pudo enviar la solicitud.'}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeChanges}>
            Cancelar
          </CButton>
          <CButton
            color="warning"
            disabled={requestChanges.isPending}
            onClick={() =>
              requestChanges.mutate(changesNote || undefined, { onSuccess: closeChanges })
            }
          >
            {requestChanges.isPending ? <CSpinner size="sm" /> : 'Enviar solicitud'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Reject modal */}
      <CModal visible={rejectModal} onClose={closeReject}>
        <CModalHeader>
          <CModalTitle>Rechazar cotización</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>¿Estás seguro de que deseas rechazar esta cotización?</p>
          <CFormLabel>¿Por qué lo rechazas? (opcional)</CFormLabel>
          <CFormTextarea
            rows={3}
            maxLength={512}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Motivo del rechazo…"
          />
          {reject.error && (
            <div className="text-danger small mt-2">
              {reject.error.message || 'No se pudo rechazar.'}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeReject}>
            Cancelar
          </CButton>
          <CButton
            color="danger"
            disabled={reject.isPending}
            onClick={() => reject.mutate(rejectNote || undefined, { onSuccess: closeReject })}
          >
            {reject.isPending ? <CSpinner size="sm" /> : 'Rechazar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ReviewActions
