import { useId, useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react'
import { Modal, ModalTitle } from 'src/shared/components/Modal'
import Spinner from 'src/shared/components/Spinner'
import { fieldErrorsFromApiError } from 'src/shared/api/errors'
import { fmtMoney } from 'src/shared/utils/format'
import { paymentDraft } from './payments'
import type { AddPaymentPayload } from './types'

interface CreditPaymentModalProps {
  visible: boolean
  orderCode: string
  // What the client still owes: the credit sold less the payments since.
  balance: number
  /**
   * `payment`: register money that came in against the credit. `dispatch`: hand the order over,
   * collecting on the way — the usual moment the credit gets paid. The dispatch is never held back
   * by a balance, but then it is somebody's decision, and the note stops being optional.
   */
  mode: 'payment' | 'dispatch'
  pending: boolean
  error: Error | null
  onConfirm: (data: AddPaymentPayload) => void
  onClose: () => void
}

// One form for the two moments credit is collected, so they read the same: the balance on top, the
// two ways money arrives, and a line that says what will be left BEFORE the button is pressed.
// There is no field for credit — credit is what is owed, not a way of paying it.
const CreditPaymentModal = ({
  visible,
  orderCode,
  balance,
  mode,
  pending,
  error,
  onConfirm,
  onClose,
}: CreditPaymentModalProps) => {
  const cashId = useId()
  const transferId = useId()
  const noteId = useId()
  const [cash, setCash] = useState('')
  const [transfer, setTransfer] = useState('')
  const [note, setNote] = useState('')
  // A fresh form each time it opens (render-phase adjustment, as in `PauseDialog`).
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setCash('')
      setTransfer('')
      setNote('')
    }
  }

  const draft = paymentDraft(cash, transfer, balance)
  const dispatching = mode === 'dispatch'
  // Handing the order over with money still owed: allowed, and answered for.
  const leavesBalance = dispatching && draft.remaining > 0
  const noteMissing = leavesBalance && note.trim().length === 0
  const blocked = pending || draft.exceeds || noteMissing || (!dispatching && draft.entered <= 0)

  const fieldErrors = fieldErrorsFromApiError(error)
  const genericError = error && !fieldErrors.payment && !fieldErrors.note ? error.message : null

  const payAll = (method: 'cash' | 'transfer') => {
    setCash(method === 'cash' ? balance.toFixed(2) : '')
    setTransfer(method === 'transfer' ? balance.toFixed(2) : '')
  }

  const confirm = () => {
    if (blocked) return
    onConfirm({
      cashAmount: draft.cash > 0 ? draft.cash : undefined,
      transferAmount: draft.transfer > 0 ? draft.transfer : undefined,
      note: note.trim() || undefined,
    })
  }

  let confirmLabel = 'Registrar abono'
  if (dispatching) {
    confirmLabel = leavesBalance
      ? `Despachar con saldo de ${fmtMoney(draft.remaining)}`
      : 'Cobrar y despachar'
  }

  return (
    <Modal visible={visible} onClose={onClose} fullscreen="md">
      <CModalHeader>
        <ModalTitle>
          {dispatching ? `Despachar ${orderCode}` : `Registrar abono · ${orderCode}`}
        </ModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="credit-balance mb-3">
          <span className="eyebrow">Saldo pendiente</span>
          <span className="credit-balance__amount">{fmtMoney(balance)}</span>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <CButton color="primary" variant="outline" size="sm" onClick={() => payAll('cash')}>
            Todo efectivo
          </CButton>
          <CButton color="primary" variant="outline" size="sm" onClick={() => payAll('transfer')}>
            Todo transferencia
          </CButton>
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor={cashId}>Efectivo (USD)</CFormLabel>
          <CFormInput
            id={cashId}
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="0.00"
            invalid={draft.exceeds}
          />
        </div>
        <div className="mb-3">
          <CFormLabel htmlFor={transferId}>Transferencia (USD)</CFormLabel>
          <CFormInput
            id={transferId}
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            value={transfer}
            onChange={(e) => setTransfer(e.target.value)}
            placeholder="0.00"
            invalid={draft.exceeds}
          />
        </div>

        {/* What will be left, said before the button: the same sentence the button then acts on. */}
        <div
          className={`small mb-3 ${
            draft.exceeds
              ? 'text-danger fw-semibold'
              : draft.remaining > 0
                ? 'fw-semibold'
                : 'text-success-emphasis fw-semibold'
          }`}
          role="status"
        >
          {draft.exceeds
            ? `Excede el saldo en ${fmtMoney(draft.entered - balance)}`
            : draft.remaining > 0
              ? `Queda pendiente: ${fmtMoney(draft.remaining)}`
              : 'Con esto el saldo queda en cero.'}
        </div>
        {fieldErrors.payment && <div className="text-danger small mb-3">{fieldErrors.payment}</div>}

        <div className="mb-2">
          <CFormLabel htmlFor={noteId}>
            {leavesBalance ? (
              <>
                ¿Quién autoriza y cuándo se cobra? <span className="text-danger">*</span>
              </>
            ) : (
              'Nota (opcional)'
            )}
          </CFormLabel>
          <CFormTextarea
            id={noteId}
            rows={2}
            maxLength={dispatching ? 512 : 255}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              leavesBalance ? 'Ej.: autoriza gerencia, paga el viernes' : 'Referencia o comentario…'
            }
            invalid={!!fieldErrors.note}
          />
          {fieldErrors.note ? (
            <div className="invalid-feedback d-block">{fieldErrors.note}</div>
          ) : (
            leavesBalance && (
              <div className="form-text">
                La orden se entrega con saldo pendiente: queda en su historial quién lo decidió.
              </div>
            )
          )}
        </div>
        {genericError && <div className="text-danger small mt-2">{genericError}</div>}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancelar
        </CButton>
        <CButton
          color={dispatching ? (leavesBalance ? 'warning' : 'success') : 'primary'}
          disabled={blocked}
          onClick={confirm}
        >
          {pending ? <Spinner size="sm" /> : confirmLabel}
        </CButton>
      </CModalFooter>
    </Modal>
  )
}

export default CreditPaymentModal
