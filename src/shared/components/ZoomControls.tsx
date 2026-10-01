import { CButton, CButtonGroup } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  isZoomed: boolean
  // Which corner of the diagram to sit in. Defaults to the right; views with their own control on
  // that side (the optimizer's collapse handle) move it out of the way.
  placement?: 'top-right' | 'top-left'
}

// Large zoom buttons overlaid on the diagram. Discoverable alternative to pinch/scroll wheel,
// designed for finger use on a tablet (workshop). Must be inside a position: relative container.
const ZoomControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  isZoomed,
  placement = 'top-right',
}: ZoomControlsProps) => (
  <CButtonGroup
    vertical
    className="shadow-sm"
    role="group"
    aria-label="Zoom del diagrama"
    style={{
      position: 'absolute',
      top: 8,
      ...(placement === 'top-left' ? { left: 8 } : { right: 8 }),
      zIndex: 2,
    }}
  >
    <CButton color="light" size="lg" title="Acercar" aria-label="Acercar" onClick={onZoomIn}>
      <Icon name="zoomIn" />
    </CButton>
    <CButton color="light" size="lg" title="Alejar" aria-label="Alejar" onClick={onZoomOut}>
      <Icon name="zoomOut" />
    </CButton>
    <CButton
      color="light"
      size="lg"
      title="Centrar y ajustar a la vista"
      aria-label="Centrar y ajustar a la vista"
      disabled={!isZoomed}
      onClick={onReset}
    >
      {/* Not 'fullscreen': the optimizer's own fullscreen toggle already uses that icon on the
          same screen, so the two actions read as the same one. */}
      <Icon name="fit" />
    </CButton>
  </CButtonGroup>
)

export default ZoomControls
