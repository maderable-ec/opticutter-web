import {
  CAlert,
  CButton,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import type { EdgeSide } from './types'
import { EDGE_SIDES, selectedSides } from './optimizerForm'
import type { EdgeBandingForm } from './optimizerForm'
import { useEdgeBandings } from './useOptimizer'

const BAR = '#d9480f'

interface EdgeBandingModalProps {
  visible: boolean
  value: EdgeBandingForm
  pieceLabel?: string
  onChange: (eb: EdgeBandingForm) => void
  onClose: () => void
}

const sideLabel = (key: EdgeSide) => EDGE_SIDES.find((s) => s.key === key)?.label ?? key

const EdgeBandingModal = ({
  visible,
  value,
  pieceLabel,
  onChange,
  onClose,
}: EdgeBandingModalProps) => {
  const { data: edgeBandings = [] } = useEdgeBandings()

  const toggle = (key: EdgeSide) =>
    onChange({ ...value, sides: { ...value.sides, [key]: !value.sides[key] } })

  const setAll = (on: boolean) =>
    onChange({ ...value, sides: { top: on, bottom: on, left: on, right: on } })

  // Helper de render (no es un componente) para evitar recrear componentes en cada render.
  const renderSide = (side: EdgeSide) => {
    const active = value.sides[side]
    return (
      <CButton
        size="sm"
        color={active ? 'primary' : 'secondary'}
        variant={active ? undefined : 'outline'}
        onClick={() => toggle(side)}
      >
        {sideLabel(side)}
      </CButton>
    )
  }

  const chosen = selectedSides(value)
  const missingProduct = chosen.length > 0 && value.productId === ''

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Tapacanto {pieceLabel ? `· ${pieceLabel}` : ''}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CFormLabel>Producto</CFormLabel>
        <CFormSelect
          value={value.productId}
          onChange={(e) => onChange({ ...value, productId: e.target.value })}
          className="mb-3"
        >
          <option value="">— Sin tapacanto —</option>
          {edgeBandings.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </CFormSelect>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <CFormLabel className="mb-0">Lados a tapar</CFormLabel>
          <div className="d-flex gap-2">
            <CButton size="sm" color="secondary" variant="ghost" onClick={() => setAll(true)}>
              Todos
            </CButton>
            <CButton size="sm" color="secondary" variant="ghost" onClick={() => setAll(false)}>
              Ninguno
            </CButton>
          </div>
        </div>

        {/* Cruz: botones de lado alrededor de un cuadro de vista previa con la orientación. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gridTemplateRows: 'auto auto auto',
            gap: 8,
            alignItems: 'center',
            justifyItems: 'center',
            maxWidth: 300,
            margin: '0 auto',
          }}
        >
          <span />
          {renderSide('top')}
          <span />

          {renderSide('left')}
          <div
            style={{
              position: 'relative',
              width: 76,
              height: 76,
              border: '1px solid #ced4da',
              borderRadius: 4,
              background: '#fff',
            }}
          >
            {value.sides.top && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: BAR,
                }}
              />
            )}
            {value.sides.bottom && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: BAR,
                }}
              />
            )}
            {value.sides.left && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 6,
                  background: BAR,
                }}
              />
            )}
            {value.sides.right && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: 6,
                  background: BAR,
                }}
              />
            )}
          </div>
          {renderSide('right')}

          <span />
          {renderSide('bottom')}
          <span />
        </div>

        {missingProduct && (
          <CAlert color="warning" className="mt-3 mb-0 py-2 small">
            Seleccioná un producto de tapacanto o el tapacanto no se aplicará.
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          onClick={() =>
            onChange({
              productId: '',
              sides: { top: false, bottom: false, left: false, right: false },
            })
          }
        >
          Quitar tapacanto
        </CButton>
        <CButton color="primary" onClick={onClose}>
          Listo
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EdgeBandingModal
