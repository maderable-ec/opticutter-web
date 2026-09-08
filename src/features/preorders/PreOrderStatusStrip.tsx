import { CAlert, CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilExternalLink, cilLink } from '@coreui/icons'

import { fmtDate, fmtDateTime } from 'src/shared/utils/format'
import { isOpen } from './status'
import type { PreOrderStatus, ReviewLinkInfo } from './types'

// Where the quote stands AND what to do about it. It replaces four mutually exclusive full-width
// alerts plus a card that held a single sentence about the review link — five blocks of which at most
// two were ever true at once, each costing a heading and a frame to say something shorter than its
// own title.
//
// The link is reported here rather than on its own because it is not a separate subject: "enviada al
// cliente" and "el enlace vence el 20" are one fact about one moment in the quote's life. And the
// ACTION belongs here for the same reason: sharing the link is a move in the quote's life, not an
// edit of its contents — the footer is the editing bar (volver · otra alternativa · guardar) and
// which action applies depends on the status this component already switches on.

const LINK_STATUS_LABELS: Record<string, string> = {
  active: 'activo',
  used: 'usado por el cliente',
  revoked: 'reemplazado',
}

interface PreOrderStatusStripProps {
  status: PreOrderStatus
  clientNote?: string | null
  orderId?: number | null
  expiresAt?: string | null
  link?: ReviewLinkInfo | null
  // Mints the review link (or opens the regenerate confirmation). Omitted when the reader cannot act
  // — a closed quote, or a role without permission — and the strip falls back to the sentence alone.
  onShare?: () => void
  isSharePending?: boolean
  // Why the button is inert right now: unsaved edits, or a client with no phone. Printed beside it,
  // the same way `WizardFooter` pairs `nextHint` with `nextDisabled` — a disabled button with no
  // reason is the one thing worse than no button.
  shareBlockedReason?: string
  onViewOrder?: () => void
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'secondary'

const PreOrderStatusStrip = ({
  status,
  clientNote,
  orderId,
  expiresAt,
  link,
  onShare,
  isSharePending,
  shareBlockedReason,
  onViewOrder,
}: PreOrderStatusStripProps) => {
  let tone: Tone = 'info'
  let sentence = ''

  switch (status) {
    case 'draft':
      // The landing state after "Crear cotización" in the optimizer, and the one place in the app
      // that has to name the next step out loud — the seller arrives here with nothing else to go on.
      sentence = 'Borrador. Genera el enlace de revisión y envíaselo al cliente.'
      break
    case 'sent':
      sentence = 'Enviada al cliente. Esperando su respuesta.'
      break
    case 'changes_requested':
      tone = 'warning'
      sentence = 'El cliente solicitó cambios. Edita la cotización y vuelve a generar el enlace.'
      break
    case 'confirmed':
      tone = 'success'
      sentence = orderId
        ? 'Cotización confirmada. Se generó la orden de producción.'
        : 'Cotización confirmada.'
      break
    case 'rejected':
      tone = 'danger'
      sentence = 'Cotización rechazada por el cliente.'
      break
    case 'expired':
      tone = 'warning'
      sentence = `Esta cotización venció${expiresAt ? ` el ${fmtDate(expiresAt)}` : ''}.`
      break
    case 'cancelled':
      tone = 'secondary'
      sentence = 'Cotización cancelada.'
      break
  }

  const open = isOpen(status)
  const showLink = link && open
  const linkText = showLink
    ? `Enlace ${LINK_STATUS_LABELS[link.status] ?? link.status}` +
      (link.usedAt
        ? ` el ${fmtDateTime(link.usedAt)}`
        : link.expiresAt
          ? ` · vence ${fmtDate(link.expiresAt)}`
          : '')
    : null

  // "Regenerar", never "Reenviar": the POST revokes whatever link came before it, so re-sending the
  // same one is not on offer. On `sent` the quote is already out there and this is an escape hatch
  // ("perdí el enlace"), so it steps back to an outline; on `draft` and `changes_requested` it IS
  // the next step and carries the brand colour.
  const shareLabel = link ? 'Regenerar enlace' : 'Compartir enlace'
  const shareIsNextStep = status !== 'sent'

  return (
    <CAlert color={tone} className="py-2 small mb-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span>{sentence}</span>
        <div className="ms-auto d-flex flex-wrap align-items-center gap-2">
          {linkText && <span className="opacity-75">{linkText}</span>}
          {onShare && open && (
            <>
              {shareBlockedReason && <span className="opacity-75">{shareBlockedReason}</span>}
              <CButton
                size="sm"
                color={shareIsNextStep ? 'primary' : 'secondary'}
                variant={shareIsNextStep ? undefined : 'outline'}
                type="button"
                disabled={isSharePending || !!shareBlockedReason}
                title={shareBlockedReason}
                onClick={onShare}
              >
                {isSharePending ? (
                  <CSpinner size="sm" className="me-1" />
                ) : (
                  <CIcon icon={cilLink} className="me-1" />
                )}
                {shareLabel}
              </CButton>
            </>
          )}
          {onViewOrder && !open && (
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              type="button"
              onClick={onViewOrder}
            >
              <CIcon icon={cilExternalLink} className="me-1" />
              Ver orden
            </CButton>
          )}
        </div>
      </div>
      {/* The client's own words: the one part of a status that is worth reading rather than
          scanning, so it keeps a block of its own. Marked with a rule instead of a fill — a fill
          light enough to read against a warning alert is unreadable in dark mode. */}
      {status === 'changes_requested' && clientNote && (
        <div className="mt-2 ps-2 border-start border-2">
          <strong>Nota del cliente:</strong> {clientNote}
        </div>
      )}
    </CAlert>
  )
}

export default PreOrderStatusStrip
