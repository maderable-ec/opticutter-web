import { CButton } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

interface ConsumablesButtonProps {
  onClick: () => void
  // The canvas's bar has no room for the word: the glyph alone, at the size of its neighbours.
  iconOnly?: boolean
  className?: string
}

// The way into «Insumos», the same control on the queue's header and on the cutting canvas.
const ConsumablesButton = ({
  onClick,
  iconOnly = false,
  className = '',
}: ConsumablesButtonProps) =>
  iconOnly ? (
    <CButton
      color="secondary"
      variant="outline"
      size="lg"
      className={className}
      title="Insumos"
      aria-label="Insumos: sierra, incisor y goma"
      onClick={onClick}
    >
      <Icon name="consumables" />
    </CButton>
  ) : (
    <CButton
      color="secondary"
      variant="outline"
      className={`consumables-entry ${className}`}
      aria-label="Insumos: sierra, incisor y goma"
      onClick={onClick}
    >
      <Icon name="consumables" />
      <span className="consumables-entry__label">Insumos</span>
    </CButton>
  )

export default ConsumablesButton
