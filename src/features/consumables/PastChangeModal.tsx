import { useId, useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react'
import { fieldErrorsFromApiError } from 'src/shared/api/errors'
import { Modal, ModalTitle } from 'src/shared/components/Modal'
import Spinner from 'src/shared/components/Spinner'
import { CONSUMABLE_LABEL, conditionLabel, isBlade } from './consumables'
import type { BladeCondition, ConsumableType, RegisterChangePayload } from './types'

interface PastChangeModalProps {
  visible: boolean
  branches: { id: number; name: string }[]
  // The branch the report is filtered to, as the form's starting point.
  branchId?: number
  pending: boolean
  error: Error | null
  onConfirm: (data: RegisterChangePayload) => void
  onClose: () => void
}

const TYPES: ConsumableType[] = ['saw_blade', 'scoring_blade', 'glue']
const CONDITIONS: BladeCondition[] = ['new', 'sharpened']

// `<input type="datetime-local">` speaks local wall-clock time with no zone: «2026-10-06T08:12».
const localInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// A change nobody registered when it happened: the office enters it with its date, so the blade
// that went on that day starts counting from then. It is also how the count is started on the
// blades that were already on the saw the day the shop began registering.
//
// A correction, not a tap on the shop floor: the API asks no reason of it, however close it lands
// to another change — only that it does not land on top of one.
const PastChangeModal = ({
  visible,
  branches,
  branchId,
  pending,
  error,
  onConfirm,
  onClose,
}: PastChangeModalProps) => {
  const id = useId()
  const [branch, setBranch] = useState('')
  const [type, setType] = useState<ConsumableType>('saw_blade')
  const [condition, setCondition] = useState<BladeCondition>('sharpened')
  const [quantity, setQuantity] = useState('')
  const [when, setWhen] = useState('')
  // Checked as the date is typed (an event, where the clock may be read), not on every render.
  const [future, setFuture] = useState(false)
  const [note, setNote] = useState('')
  // A fresh form each time it opens (render-phase adjustment, as in `PauseDialog`).
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setBranch(String(branchId ?? (branches.length === 1 ? (branches[0]?.id ?? '') : '')))
      setType('saw_blade')
      setCondition('sharpened')
      setQuantity('')
      setWhen('')
      setFuture(false)
      setNote('')
    }
  }

  const blade = isBlade(type)
  const kg = Number(quantity)
  const at = when ? new Date(when) : null
  const blocked =
    pending || !branch || !at || future || (!blade && quantity !== '' && !(kg > 0 && kg <= 50))

  const fieldErrors = fieldErrorsFromApiError(error)
  const known = ['changedAt', 'quantity', 'branchId', 'condition']
  const genericError = error && !known.some((field) => fieldErrors[field]) ? error.message : null

  const confirm = () => {
    if (blocked || !at) return
    onConfirm({
      type,
      branchId: Number(branch),
      condition: blade ? condition : undefined,
      // Left empty, the load takes the standard quantity.
      quantity: !blade && quantity !== '' ? kg : undefined,
      note: note.trim() || undefined,
      changedAt: at.toISOString(),
    })
  }

  return (
    <Modal visible={visible} onClose={onClose} fullscreen="md">
      <CModalHeader>
        <ModalTitle>Registrar cambio pasado</ModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-body-secondary">
          Para un cambio que no se registró en su momento. Cuenta desde la fecha que indiques.
        </p>
        <div className="mb-3">
          <CFormLabel htmlFor={`${id}-branch`}>Sucursal</CFormLabel>
          <CFormSelect
            id={`${id}-branch`}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            invalid={!!fieldErrors.branchId}
          >
            <option value="">Elige una sucursal</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </CFormSelect>
          {fieldErrors.branchId && (
            <div className="invalid-feedback d-block">{fieldErrors.branchId}</div>
          )}
        </div>
        <div className="mb-3">
          <CFormLabel htmlFor={`${id}-type`}>Insumo</CFormLabel>
          <CFormSelect
            id={`${id}-type`}
            value={type}
            onChange={(e) => setType(e.target.value as ConsumableType)}
          >
            {TYPES.map((value) => (
              <option key={value} value={value}>
                {CONSUMABLE_LABEL[value]}
              </option>
            ))}
          </CFormSelect>
        </div>
        {blade ? (
          <div className="mb-3">
            <CFormLabel htmlFor={`${id}-condition`}>Qué se montó</CFormLabel>
            <CFormSelect
              id={`${id}-condition`}
              value={condition}
              onChange={(e) => setCondition(e.target.value as BladeCondition)}
            >
              {CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {conditionLabel(type, value)}
                </option>
              ))}
            </CFormSelect>
          </div>
        ) : (
          <div className="mb-3">
            <CFormLabel htmlFor={`${id}-quantity`}>Kilos cargados</CFormLabel>
            <CFormInput
              id={`${id}-quantity`}
              type="number"
              inputMode="decimal"
              min={0.5}
              max={50}
              step={0.5}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="La carga estándar"
              invalid={!!fieldErrors.quantity}
            />
            {fieldErrors.quantity ? (
              <div className="invalid-feedback d-block">{fieldErrors.quantity}</div>
            ) : (
              <div className="form-text">Vacío, toma la carga estándar de Configuración.</div>
            )}
          </div>
        )}
        <div className="mb-3">
          <CFormLabel htmlFor={`${id}-when`}>Fecha y hora del cambio</CFormLabel>
          <CFormInput
            id={`${id}-when`}
            type="datetime-local"
            value={when}
            max={localInputValue(new Date())}
            onChange={(e) => {
              setWhen(e.target.value)
              setFuture(!!e.target.value && new Date(e.target.value).getTime() > Date.now())
            }}
            invalid={future || !!fieldErrors.changedAt}
          />
          {(future || fieldErrors.changedAt) && (
            <div className="invalid-feedback d-block">
              {fieldErrors.changedAt ?? 'La fecha del cambio no puede ser futura.'}
            </div>
          )}
        </div>
        <div className="mb-2">
          <CFormLabel htmlFor={`${id}-note`}>Nota (opcional)</CFormLabel>
          <CFormTextarea
            id={`${id}-note`}
            rows={2}
            maxLength={255}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quién lo cambió, o por qué se registra ahora"
          />
        </div>
        {genericError && (
          <div className="text-danger small mt-2" role="alert">
            {genericError}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancelar
        </CButton>
        <CButton color="primary" disabled={blocked} onClick={confirm}>
          {pending ? <Spinner size="sm" /> : 'Registrar cambio'}
        </CButton>
      </CModalFooter>
    </Modal>
  )
}

export default PastChangeModal
