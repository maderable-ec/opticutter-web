import { CBadge, CButton, CModalBody, CModalHeader } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import BoardName from './BoardName'
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
                <span className="fw-semibold text-nowrap">Tablero {b.sheetNumber}</span>
                <span className={`badge status-pill status-pill--${state.tone} ms-auto`}>
                  {state.icon && <Icon name={state.icon} className="status-pill__icon" />}
                  {state.label}
                </span>
              </span>
              {/* In full: the material is how the operador matches a board to the rack. The half
                  pill follows it, as in the canvas's strip; beside «Tablero N» it left the row no
                  room in the iPad's three columns. */}
              <span className="workshop-picker__name small d-block">
                <BoardName productName={b.productName} />
                {b.halfBoard && (
                  <CBadge color="info" className="ms-2">
                    ½ medio
                  </CBadge>
                )}
              </span>
            </CButton>
          )
        })}
      </div>
    </CModalBody>
  </Modal>
)

export default WorkshopBoardPicker
