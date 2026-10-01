import { useEffect, useId, useRef } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { CButton, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'
import Spinner from './Spinner'
import { Modal, ModalTitle, useModalHost } from './Modal'

export type ConfirmTone = 'primary' | 'success' | 'danger'

export interface ConfirmDialogProps {
  visible: boolean
  // Verb and object, the way the action is named where it was asked for: «Eliminar cotización»,
  // «Iniciar canteado de ORD-000043». Never «Confirmar acción»: the title is the dialog's name.
  title: ReactNode
  // What happens, in a sentence or two. Leave out what the title already says.
  children?: ReactNode
  // A second line in secondary ink: the consequence nobody would guess from the button.
  note?: ReactNode
  // The verb again, on the button: on a touch panel the button about to be pressed has to say
  // what it does.
  confirmLabel: string
  cancelLabel?: string
  // `danger` for what cannot be undone, `success` for closing a job, `primary` for the rest.
  tone?: ConfirmTone
  pending?: boolean
  // Holds the button back (a note still missing); the reason belongs in the body.
  disabled?: boolean
  error?: ReactNode
  // The shop floor's size: `lg` buttons and body text, for a gloved hand on a panel.
  touch?: boolean
  // Where to portal it when it opens over an element in fullscreen. Inside another `Modal` it is
  // not needed: the dialog mounts inside that one by itself.
  container?: ComponentProps<typeof Modal>['container']
  // Below `md`, a dialog that holds a form (a note) takes the whole screen like the other forms.
  fullscreen?: 'md'
  onConfirm: () => void
  onClose: () => void
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// The one way the dashboard asks «are you sure?». It replaced `window.confirm` (unstyled, tiny on a
// touch panel, and it froze the tab) and the dialogs every screen used to build by hand, two of them
// titled «Confirmar acción».
//
// While it is up it owns the keyboard, from the window's capture phase: Esc closes it, Tab stays
// inside it, and no other key reaches the screen underneath. Without that, Supr deleted a row of the
// despiece behind the question, ← → paged the sheet under it, and Esc also closed the dialog it was
// asked from, since CoreUI listens for Esc on the document in every open dialog at once.
const ConfirmDialog = ({
  visible,
  title,
  children,
  note,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  pending = false,
  disabled = false,
  error,
  touch = false,
  container,
  fullscreen,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const host = useModalHost()
  const bodyId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  // Read by the listener, which binds once per opening.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) return
      const inside = dialog.contains(document.activeElement)
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible])

  // Opened over another dialog, closing this one must not unlock the page under both: CoreUI
  // drops `modal-open` and the body's `overflow` whenever any dialog closes. This runs after its
  // layout effect, so it puts them back while the dialog underneath is still up.
  useEffect(() => {
    if (visible || !host?.isConnected) return
    document.body.classList.add('modal-open')
    document.body.style.overflow = 'hidden'
  }, [visible, host])

  const size = touch ? 'lg' : undefined
  return (
    <Modal
      ref={dialogRef}
      visible={visible}
      onClose={onClose}
      // Its own Esc, above: CoreUI's would close every dialog open at the same time.
      keyboard={false}
      alignment="center"
      fullscreen={fullscreen}
      container={host ?? container}
      role="alertdialog"
      aria-describedby={children ? bodyId : undefined}
    >
      <CModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </CModalHeader>
      <CModalBody className={touch ? 'fs-5' : undefined}>
        {children && <div id={bodyId}>{children}</div>}
        {note && <p className="text-body-secondary small mt-2 mb-0">{note}</p>}
        {error && (
          <p className="text-danger small mt-2 mb-0" role="alert">
            {error}
          </p>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size={size} onClick={onClose}>
          {cancelLabel}
        </CButton>
        <CButton color={tone} size={size} disabled={pending || disabled} onClick={onConfirm}>
          {pending ? <Spinner size="sm" /> : confirmLabel}
        </CButton>
      </CModalFooter>
    </Modal>
  )
}

export default ConfirmDialog
