import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { PreOrderStatus } from './types'

// The seven labels lived only in `PreOrderStatusBadge`, which is where the badge looks for them and
// nowhere the list page's filter options could. Same move as `orders/status.ts`: one module knows
// where a quote stands, and the badge is just one of its readers.
// `changes_requested` is `progress`, the one open state that waits on the SELLER: the client answered
// and the quote needs a look before it goes back out.
export const PREORDER_STATUS_CONFIG: Record<PreOrderStatus, StatusConfigEntry> = {
  draft: { tone: 'neutral', icon: 'draft', label: 'Borrador' },
  sent: { tone: 'info', icon: 'sent', label: 'Enviada' },
  changes_requested: { tone: 'progress', icon: 'changesRequested', label: 'Cambios solicitados' },
  confirmed: { tone: 'success', icon: 'confirmed', label: 'Confirmada' },
  rejected: { tone: 'danger', icon: 'rejected', label: 'Rechazada' },
  expired: { tone: 'neutral', icon: 'expired', label: 'Vencida' },
  cancelled: { tone: 'danger', icon: 'cancelled', label: 'Cancelada' },
}

export const PREORDER_STATUS_VALUES = Object.keys(PREORDER_STATUS_CONFIG) as PreOrderStatus[]

export const statusLabel = (status: PreOrderStatus) => PREORDER_STATUS_CONFIG[status].label

// draft / sent / changes_requested: the quote is still open. It can be edited, it can carry a review
// link, and its expiry date still matters. Every other status is terminal.
//
// This list was written out three times — as `canEdit` on the detail page, as `ACTIVE_STATES` on the
// list page, and again in the review-link card's render condition — which is three places to forget
// when a status is added.
export const OPEN_STATES: PreOrderStatus[] = ['draft', 'sent', 'changes_requested']

export const isOpen = (status: PreOrderStatus) => OPEN_STATES.includes(status)

// Within three days of expiring, and still open: flagged in the list and in the detail header.
export const isExpiringSoon = (expiresAt: string | null | undefined, status: PreOrderStatus) => {
  if (!expiresAt || !isOpen(status)) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
}
