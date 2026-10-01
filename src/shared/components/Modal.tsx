import { createContext, useCallback, useContext, useId, useState } from 'react'
import type { ComponentProps } from 'react'
import { CModal, CModalTitle } from '@coreui/react'

// CoreUI's dialog does not tie itself to its title, so a screen reader opened every one of them as
// a nameless «dialog», and its `h5` title skipped four levels under the page's `h1`. Every dialog
// in the app goes through this pair instead: `Modal` names itself after the `ModalTitle` inside it
// (the id travels by context, so the title may sit in a child component), and the title is an `h2`
// that keeps the `h5` look. ESLint keeps `CModal` and `CModalTitle` from being imported elsewhere.

const TitleId = createContext<string | undefined>(undefined)

// The open dialog's own element, for a dialog that opens over it (`ConfirmDialog`). Mounted inside
// it rather than beside it on `document.body`, the second dialog sits inside the first one's focus
// trap and inside whatever element is in fullscreen; beside it, CoreUI's trap pulled the focus
// back out of the question the moment it opened.
const Host = createContext<HTMLDivElement | null>(null)

export const useModalHost = () => useContext(Host)

export const Modal = ({ ref, ...props }: ComponentProps<typeof CModal>) => {
  const id = useId()
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      setHost(el)
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )
  return (
    <TitleId.Provider value={id}>
      <Host.Provider value={host}>
        <CModal aria-labelledby={id} ref={attach} {...props} />
      </Host.Provider>
    </TitleId.Provider>
  )
}

export const ModalTitle = ({ className, ...props }: ComponentProps<typeof CModalTitle>) => (
  <CModalTitle as="h2" id={useContext(TitleId)} className={`h5 ${className ?? ''}`} {...props} />
)
