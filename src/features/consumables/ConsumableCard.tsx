import { useId, useState } from 'react'
import { CButton } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'
import Spinner from 'src/shared/components/Spinner'
import {
  CONSUMABLE_ICON,
  CONSUMABLE_LABEL,
  fmtKg,
  isBlade,
  justChangedLabel,
  mountLabel,
  sinceLine,
  stepGlue,
  usageLine,
} from './consumables'
import type { BladeCondition, ConsumableStatus } from './types'

// What the card asks the sheet to register: the blade's condition, or the kg of glue.
export interface ChangeIntent {
  condition?: BladeCondition
  quantity?: number
}

interface ConsumableCardProps {
  item: ConsumableStatus
  // This card's own request is in flight (the mutation is shared by the sheet).
  pending: boolean
  error?: string | null
  onChange: (intent: ChangeIntent) => void
  onUndo: () => void
}

const CONDITIONS: BladeCondition[] = ['new', 'sharpened']

// One consumable on the shop floor: what is on the machine, what it has done since it went on, and
// the tap that registers the next one. The blade's condition IS the button and the glue's control
// already sits on the standard load, so the usual change is one tap and asks nothing.
//
// Right after a change the buttons are held back (the API would refuse a second one for a minute)
// and say why in words — a disabled button with its reason in a `title` says nothing on a panel.
// Whoever registered it gets «Deshacer» in their place: a tap by mistake is the likeliest error
// here, and one that cannot be taken back would sit in the blade's record for good.
const ConsumableCard = ({ item, pending, error, onChange, onUndo }: ConsumableCardProps) => {
  const nameId = useId()
  const { type, lastChange: last } = item
  const [kg, setKg] = useState(item.standardQuantity ?? 5)
  // The office retuned the standard load while the sheet was closed: start from the new one.
  const [standard, setStandard] = useState(item.standardQuantity)
  if (item.standardQuantity !== standard) {
    setStandard(item.standardQuantity)
    if (item.standardQuantity != null) setKg(item.standardQuantity)
  }
  const held = item.gate === 'blocked'

  return (
    <section className="consumable" aria-labelledby={nameId}>
      <div className="consumable__head">
        <Icon name={CONSUMABLE_ICON[type]} size="xl" className="consumable__icon" />
        <div className="consumable__facts">
          <h3 id={nameId} className="consumable__name">
            {CONSUMABLE_LABEL[type]}
          </h3>
          {last ? (
            <>
              <div className="consumable__usage">{usageLine(item)}</div>
              <div className="consumable__since">{sinceLine(last)}</div>
            </>
          ) : (
            <div className="consumable__since">
              Sin registro. {isBlade(type) ? 'El primer cambio' : 'La primera carga'} empieza la
              cuenta.
            </div>
          )}
        </div>
      </div>

      {(held || item.canUndo) && (
        <div className="consumable__held">
          <Icon name="check" size="lg" />
          <span>{held ? justChangedLabel(type) : 'Lo registraste hace poco'}</span>
          {item.canUndo && (
            <CButton
              color="secondary"
              variant="outline"
              size="lg"
              className="ms-auto text-nowrap"
              disabled={pending}
              onClick={onUndo}
            >
              <Icon name="undo" className="me-1" />
              Deshacer
            </CButton>
          )}
        </div>
      )}

      {isBlade(type) ? (
        <div className="consumable__actions">
          {CONDITIONS.map((condition) => (
            <CButton
              key={condition}
              color="primary"
              variant="outline"
              size="lg"
              disabled={held || pending}
              onClick={() => onChange({ condition })}
            >
              {mountLabel(type, condition)}
            </CButton>
          ))}
        </div>
      ) : (
        <div className="consumable__actions consumable__actions--glue">
          <div className="consumable__stepper" role="group" aria-label="Kilos de goma">
            <CButton
              color="secondary"
              variant="outline"
              size="lg"
              aria-label="Medio kilo menos"
              disabled={held || pending}
              onClick={() => setKg((value) => stepGlue(value, -1))}
            >
              <Icon name="minus" />
            </CButton>
            <output className="consumable__kg" aria-live="polite">
              {fmtKg(kg)}
            </output>
            <CButton
              color="secondary"
              variant="outline"
              size="lg"
              aria-label="Medio kilo más"
              disabled={held || pending}
              onClick={() => setKg((value) => stepGlue(value, 1))}
            >
              <Icon name="add" />
            </CButton>
          </div>
          <CButton
            color="primary"
            size="lg"
            disabled={held || pending}
            onClick={() => onChange({ quantity: kg })}
          >
            Cargué {fmtKg(kg)}
          </CButton>
        </div>
      )}

      {pending && (
        <div className="consumable__note">
          <Spinner size="sm" /> Registrando…
        </div>
      )}
      {error && (
        <div className="consumable__note text-danger" role="alert">
          {error}
        </div>
      )}
    </section>
  )
}

export default ConsumableCard
