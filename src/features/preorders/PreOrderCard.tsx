import { MASK } from 'src/shared/analytics'
import ListCard from 'src/shared/components/ListCard'
import { clientName, fmtDate } from 'src/shared/utils/format'
import PreOrderStatusBadge from './PreOrderStatusBadge'
import { isExpiringSoon } from './status'
import type { PreOrderSummary } from './types'

// One quote of the listing on a phone, in place of the seven-column table that scrolled sideways and
// left the status and the due date — what a seller follows a quote up by — off the screen. The same
// shape as `OrderCard`: code and status, then whose job it is, then the short facts.
//
// The due date is the one fact that can be urgent, so it carries the table's own warning: red and
// marked while the quote is open and three days or less from expiring.

interface PreOrderCardProps {
  preorder: PreOrderSummary
}

const PreOrderCard = ({ preorder }: PreOrderCardProps) => {
  const reference = preorder.notes?.trim()
  const expiringSoon = isExpiringSoon(preorder.expiresAt, preorder.status)

  return (
    <ListCard
      to={`/preorders/${preorder.id}`}
      title={preorder.code}
      badges={<PreOrderStatusBadge status={preorder.status} />}
      meta={
        <>
          <span>{preorder.branch.name}</span>
          <span>{fmtDate(preorder.createdAt)}</span>
          {preorder.expiresAt && (
            <span className={expiringSoon ? 'text-danger fw-semibold' : undefined}>
              Vence {fmtDate(preorder.expiresAt)}
              {expiringSoon && ' ⚠'}
            </span>
          )}
        </>
      }
    >
      <div className="text-truncate mt-1" {...MASK}>
        {clientName(preorder.client)}
        {reference && <span className="text-body-secondary"> · {reference}</span>}
      </div>
    </ListCard>
  )
}

export default PreOrderCard
