import { CButton, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'

import { fmtMoney } from './format'
import Spinner from 'src/shared/components/Spinner'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

interface ReviewConfirmModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  total: number
  currency: string
  totalBoards: number
  totalPieces: number
  isPending: boolean
  error?: string | null
}

// Confirming is irreversible — it mints the order — so it is a second tap, never the bar's button
// on its own. Clients kept closing this dialog believing the first tap had already confirmed: the
// title echoed the button they had just pressed, a blue alert told them what happens to "tu pedido"
// next, and the only action was disabled until a checkbox nobody noticed was ticked. So the dialog
// is now a question that says the order is not confirmed yet, the declaration rides on the button
// (tapping it is the acceptance), and what happens afterwards is plain text in the future tense.
// The static backdrop keeps a stray tap outside from dismissing a decision that is still open.
const ReviewConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  total,
  currency,
  totalBoards,
  totalPieces,
  isPending,
  error,
}: ReviewConfirmModalProps) => (
  <Modal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader>
      <ModalTitle>¿Confirmas tu pedido?</ModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Tu pedido <strong>aún no está confirmado</strong>: falta este último paso.
      </p>

      <div className="d-flex justify-content-between align-items-baseline">
        <span className="text-body-secondary">Total a pagar</span>
        <span className="fs-4 fw-semibold">{fmtMoney(total, currency)}</span>
      </div>
      <div className="text-body-secondary small mb-3">
        {totalBoards} {totalBoards === 1 ? 'tablero' : 'tableros'} · {totalPieces}{' '}
        {totalPieces === 1 ? 'pieza' : 'piezas'}
      </div>

      {/* The order is born `confirmed` but only enters the cutting queue once someone registers
          the payment. Said before the decision so nobody expects the saw to start, but as plain
          text: as an alert it was the loudest thing in the dialog and read like a receipt. */}
      <p className="text-body-secondary small mb-3">
        <strong>Después de confirmar</strong>, coordina el pago con tu asesor: el corte empieza
        cuando se registra.
      </p>

      {/* Right above the button it describes: tapping it is the acceptance. */}
      <p className="small mb-0">
        Al tocar «Sí, confirmar pedido» declaras que revisaste las medidas, los cantos y los
        materiales, y autorizas la producción. Después ya no podrás modificarlo desde este enlace.
      </p>

      {error && <div className="text-danger small mt-2">{error}</div>}
    </CModalBody>
    <CModalFooter className="review-confirm__footer">
      <CButton color="secondary" variant="outline" onClick={onClose} disabled={isPending}>
        Volver a revisar
      </CButton>
      <CButton color="primary" disabled={isPending} onClick={onConfirm}>
        {isPending ? <Spinner size="sm" /> : 'Sí, confirmar pedido'}
      </CButton>
    </CModalFooter>
  </Modal>
)

export default ReviewConfirmModal
