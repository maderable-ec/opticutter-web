import { CButton, CButtonGroup } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFullscreen, cilZoomIn, cilZoomOut } from '@coreui/icons'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  isZoomed: boolean
}

// Botones grandes de zoom como overlay sobre el diagrama. Alternativa descubrible al pinch/rueda,
// pensada para dedos en tablet (taller). Debe ir dentro de un contenedor con position: relative.
const ZoomControls = ({ onZoomIn, onZoomOut, onReset, isZoomed }: ZoomControlsProps) => (
  <CButtonGroup
    vertical
    className="shadow-sm"
    role="group"
    aria-label="Zoom del diagrama"
    style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
  >
    <CButton color="light" size="lg" title="Acercar" aria-label="Acercar" onClick={onZoomIn}>
      <CIcon icon={cilZoomIn} />
    </CButton>
    <CButton color="light" size="lg" title="Alejar" aria-label="Alejar" onClick={onZoomOut}>
      <CIcon icon={cilZoomOut} />
    </CButton>
    <CButton
      color="light"
      size="lg"
      title="Ajustar a la vista"
      aria-label="Ajustar a la vista"
      disabled={!isZoomed}
      onClick={onReset}
    >
      <CIcon icon={cilFullscreen} />
    </CButton>
  </CButtonGroup>
)

export default ZoomControls
