import { useState } from 'react'
import {
  CAlert,
  CButton,
  CFormInput,
  CInputGroup,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCopy } from '@coreui/icons'

import { fmtDate } from 'src/shared/utils/format'

// The one and only sighting of a review URL. The server stores just the token's sha256
// (`review_service.py`), so `GET /review-link` reports the link's dates and status and never the url
// itself: once this closes, the only way back to a working link is to mint another one — which
// revokes the one the client may already be holding.
//
// Hence `backdrop="static"`, the detail that separates this from the version it replaces: a stray
// click on the page behind it used to dismiss the dialog, leaving the quote marked "Enviada", the
// previous link dead and the new one unreachable. `PrintAgentsPage`'s TokenModal solved the same
// problem the same way — including mounting on the state itself (`{shareLink && <… />}`) rather than
// on a `visible` prop, so `copied` starts false on every link instead of carrying its flash over from
// the previous one.

export interface ShareLinkState {
  url: string
  expiresAt: string
  // A first link is created; every one after it replaces a link that was already out in the world.
  regenerated: boolean
}

interface ShareReviewLinkModalProps {
  state: ShareLinkState
  code: string
  onClose: () => void
}

const ShareReviewLinkModal = ({ state, code, onClose }: ShareReviewLinkModalProps) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  // `lg` for the same reason TokenModal takes it: a 32-byte urlsafe token makes this url ~60
  // characters, and at the default width it is cut off inside its own field.
  return (
    <CModal visible onClose={onClose} backdrop="static" size="lg">
      <CModalHeader>
        <CModalTitle>Enlace de revisión de {code}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color="warning" className="py-2 small">
          Copia este enlace ahora. Por seguridad, no se puede recuperar después de cerrar.
          {state.regenerated && ' El enlace anterior quedó revocado.'}
        </CAlert>
        <CInputGroup>
          <CFormInput value={state.url} readOnly />
          <CButton color="primary" onClick={() => void copy()}>
            <CIcon icon={cilCopy} className="me-1" />
            {copied ? '¡Copiado!' : 'Copiar'}
          </CButton>
        </CInputGroup>
        {/* The expiry travelled in the same response and used to be thrown away. The client needs it
            more than the seller does: a link handed over three days before it dies is worth saying
            out loud. */}
        <div className="form-text">Vence el {fmtDate(state.expiresAt)}.</div>
      </CModalBody>
      <CModalFooter>
        {/* "Listo", not "Cerrar": the dialog exists to hand something over, and this says it landed. */}
        <CButton color="secondary" onClick={onClose}>
          Listo
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ShareReviewLinkModal
