import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { CCloseButton, COffcanvas, COffcanvasBody, COffcanvasHeader } from '@coreui/react'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title: ReactNode
  // One muted line under the title: which record the sheet is about.
  subtitle?: ReactNode
  children: ReactNode
  // Pinned under the scrolling body: the sheet's actions, always within the thumb's reach.
  footer?: ReactNode
  className?: string
  // On the body: `p-0` for content that brings its own row padding (the filter sheet's fields).
  bodyClassName?: string
}

/**
 * A panel that rises from the bottom edge, for editing one thing without leaving the list it
 * belongs to. On a phone a centred modal puts its fields at the top of the screen, as far from the
 * thumb as they can be, and hides the list the edit is about; a sheet keeps the list peeking above
 * it and puts the actions at the bottom.
 *
 * The same sheet at every width, capped from `md` (`.bottom-sheet`): switching to a modal there
 * would need `matchMedia`, and this app lets CSS pick. Its first user, `PieceEditSheet`, only opens
 * from the phone's pieces list anyway.
 *
 * Rendered in place rather than portalled: `COffcanvas` can only portal to `document.body`, which
 * sits outside the optimizer's fullscreen host — the sheet would open there and never be painted.
 * In place it is inside the host, and `position: fixed` escapes the list's own boxes.
 */
const BottomSheet = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = '',
  bodyClassName,
}: BottomSheetProps) => {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  // CoreUI's focus trap focuses the sheet while it is still `visibility: hidden` (its entering class
  // lands a render later), and a hidden element cannot take the focus: it stayed on the button that
  // opened the sheet, so Esc, which the sheet listens for on itself, did nothing and Tab walked the
  // page underneath. Once the sheet is showing it takes the focus itself; the trap still gives it
  // back to that button on closing.
  const focusSheet = () =>
    requestAnimationFrame(() => sheetRef.current?.focus({ preventScroll: true }))
  return (
    <COffcanvas
      ref={sheetRef}
      placement="bottom"
      visible={visible}
      onShow={focusSheet}
      onHide={onClose}
      className={`bottom-sheet ${className}`}
      aria-labelledby={titleId}
    >
      <COffcanvasHeader className="bottom-sheet__header">
        <div style={{ minWidth: 0 }}>
          <h2 id={titleId} className="bottom-sheet__title">
            {title}
          </h2>
          {subtitle && <div className="bottom-sheet__subtitle">{subtitle}</div>}
        </div>
        <CCloseButton className="ms-auto" aria-label="Cerrar" onClick={onClose} />
      </COffcanvasHeader>
      <COffcanvasBody className={bodyClassName}>{children}</COffcanvasBody>
      {footer && <div className="bottom-sheet__footer">{footer}</div>}
    </COffcanvas>
  )
}

export default BottomSheet
