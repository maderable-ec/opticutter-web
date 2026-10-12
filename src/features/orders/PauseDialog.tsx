import { useId, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { CFormLabel, CFormTextarea } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import { ACTIVITY_LABEL, PAUSE_REASONS, PAUSE_REASON_ICON, PAUSE_REASON_LABEL } from './activities'
import type { ActivityType, PauseActivityPayload, PauseReason } from './types'

interface PauseDialogProps {
  visible: boolean
  // What is being paused: «Pausar corte de ORD-000131».
  activity: ActivityType
  orderCode: string
  pending?: boolean
  error?: ReactNode
  // Where to portal it over the fullscreen canvas (see `ConfirmDialog`).
  container?: ComponentProps<typeof ConfirmDialog>['container']
  onConfirm: (payload: PauseActivityPayload) => void
  onClose: () => void
}

// Why the work stops, asked on the shop floor: three targets a gloved hand can hit, each with its
// own drawing so it is picked by shape from where the operator stands, and the verb on the button.
// The reason is the point — a pause takes its stretch out of the worker's time and tells the office
// what to fix — so the button stays held back until one is chosen. The detail is optional and folded
// away: typing on that panel is the last thing anybody wants to do with the saw stopped.
const PauseDialog = ({
  visible,
  activity,
  orderCode,
  pending,
  error,
  container,
  onConfirm,
  onClose,
}: PauseDialogProps) => {
  const noteId = useId()
  const [reason, setReason] = useState<PauseReason | null>(null)
  const [note, setNote] = useState('')
  const [withNote, setWithNote] = useState(false)
  // A fresh question each time it opens: the reason of the last order must not ride into this one.
  // Render-phase adjustment, as in `WorkshopPage`: it converges on the next render.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setReason(null)
      setNote('')
      setWithNote(false)
    }
  }

  const label = ACTIVITY_LABEL[activity].toLowerCase()
  return (
    <ConfirmDialog
      visible={visible}
      touch
      container={container}
      title={`Pausar ${label} de ${orderCode}`}
      confirmLabel={`Pausar ${label}`}
      disabled={!reason}
      pending={pending}
      error={error}
      note="El tiempo en pausa no cuenta para quien hace el trabajo, y la oficina recibe el aviso."
      onConfirm={() => {
        if (reason) onConfirm({ reason, note: note.trim() || undefined })
      }}
      onClose={onClose}
    >
      <p className="mb-2">¿Por qué se detiene?</p>
      <div className="pause-reasons" role="radiogroup" aria-label="Motivo de la pausa">
        {PAUSE_REASONS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={reason === value}
            className="pause-reason"
            onClick={() => setReason(value)}
          >
            <Icon name={PAUSE_REASON_ICON[value]} size="xl" className="pause-reason__icon" />
            <span>{PAUSE_REASON_LABEL[value]}</span>
          </button>
        ))}
      </div>
      {withNote ? (
        <div className="mt-3">
          <CFormLabel htmlFor={noteId} className="fs-6">
            Detalle (opcional)
          </CFormLabel>
          <CFormTextarea
            id={noteId}
            rows={2}
            maxLength={255}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Qué falta, o qué se dañó"
          />
        </div>
      ) : (
        <button type="button" className="btn btn-link px-0 mt-2" onClick={() => setWithNote(true)}>
          Agregar un detalle
        </button>
      )}
    </ConfirmDialog>
  )
}

export default PauseDialog
