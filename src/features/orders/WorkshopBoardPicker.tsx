import { CBadge, CButton, CModalBody, CModalHeader } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import { stripHalfSuffix } from 'src/shared/utils/halfBoard'
import { boardCutState } from './progress'
import type { CutBoard } from './types'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

interface WorkshopBoardPickerProps {
  visible: boolean
  boards: CutBoard[]
  currentId: number | null
  onSelect: (boardId: number) => void
  onClose: () => void
  // Portal target, so the dialog is painted when the shell is in native fullscreen.
  container?: () => Element | null
}

// The board list, behind a tap on the top bar's pager instead of a permanent chip strip. The strip
// cost a whole row on a screen whose whole point is that nothing scrolls, and a shift only picks a
// board out of order now and then — `‹ ›` covers the rest. What it must NOT lose is the per-board
// progress, which is how the operador finds the one still pending.
const WorkshopBoardPicker = ({
  visible,
  boards,
  currentId,
  onSelect,
  onClose,
  container,
}: WorkshopBoardPickerProps) => (
  <Modal
    visible={visible}
    onClose={onClose}
    size="lg"
    scrollable
    alignment="center"
    container={container}
  >
    <CModalHeader>
      <ModalTitle>Tableros</ModalTitle>
    </CModalHeader>
    <CModalBody>
      <div className="workshop-picker">
        {boards.map((b) => {
          const state = boardCutState(b.progress)
          const current = b.id === currentId
          return (
            <CButton
              key={b.id}
              size="lg"
              color="secondary"
              variant={current ? undefined : 'outline'}
              aria-current={current ? 'true' : undefined}
              className="workshop-picker__item text-start"
              onClick={() => onSelect(b.id)}
            >
              <span className="d-flex align-items-center gap-2">
                <span className="fw-semibold">Tablero {b.sheetNumber}</span>
                {b.halfBoard && <CBadge color="info">½ medio</CBadge>}
                <span className={`badge status-pill status-pill--${state.tone} ms-auto`}>
                  {state.icon && <Icon name={state.icon} className="status-pill__icon" />}
                  {state.label}
                </span>
              </span>
              <span className="small d-block text-truncate">{stripHalfSuffix(b.productName)}</span>
            </CButton>
          )
        })}
      </div>
    </CModalBody>
  </Modal>
)

export default WorkshopBoardPicker
