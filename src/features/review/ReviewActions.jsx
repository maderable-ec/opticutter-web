import React, { useState } from 'react'
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

import { useConfirmReview, useRejectReview } from './useReview'

const ReviewActions = ({ token }) => {
  const qc = useQueryClient()
  const confirm = useConfirmReview(token)
  const reject = useRejectReview(token)
  const [rejectModal, setRejectModal] = useState(false)
  const [note, setNote] = useState('')

  const closeReject = () => {
    const hadError = !!reject.error
    setRejectModal(false)
    setNote('')
    reject.reset()
    // Si el rechazo falló (p. ej. 409 ya confirmada), re-sincronizamos al cerrar.
    if (hadError) qc.invalidateQueries({ queryKey: ['review', token] })
  }

  return (
    <>
      {confirm.error && (
        <CAlert color="danger" className="py-2 small">
          {confirm.error.message || 'No se pudo confirmar. Intentá de nuevo.'}
        </CAlert>
      )}
      <div className="d-flex gap-2 flex-wrap">
        <CButton
          color="primary"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate(undefined)}
        >
          {confirm.isPending ? <CSpinner size="sm" /> : 'Confirmar pedido'}
        </CButton>
        <CButton
          color="secondary"
          variant="outline"
          disabled={confirm.isPending}
          onClick={() => setRejectModal(true)}
        >
          Rechazar
        </CButton>
      </div>

      <CModal visible={rejectModal} onClose={closeReject}>
        <CModalHeader>
          <CModalTitle>Rechazar cotización</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>¿Estás seguro de que querés rechazar esta cotización?</p>
          <CFormLabel>¿Por qué lo rechazás? (opcional)</CFormLabel>
          <CFormTextarea
            rows={3}
            maxLength={512}
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
            onClick={() => reject.mutate(note || undefined)}
          >
            {reject.isPending ? <CSpinner size="sm" /> : 'Rechazar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ReviewActions
