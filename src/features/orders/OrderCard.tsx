import Icon from 'src/shared/icons/Icon'

import { MASK } from 'src/shared/analytics'
import ListCard from 'src/shared/components/ListCard'
import { clientName, fmtDate, fmtMoney } from 'src/shared/utils/format'
import OrderStatusBadge from './OrderStatusBadge'
import ActivityBadge from './ActivityBadge'
import ElapsedNote from './ElapsedNote'
import { statusClock } from './elapsed'
import { orderedActivities } from './activities'
import type { Order } from './types'

// One order of the listing on a phone, where the seven-column table scrolled sideways and put the
// total and the activities — what an administrador follows up on — off the screen. Rendered below
// `md` in place of the table (OrdersPage mounts both and lets the utilities pick).
//
// The COMPACT variant, chosen by the user: the activities print as their badges (track + state
// icon) without a clock each, and only the order's own status clock rides on the last line. Six
// orders fit a screen this way; which activity is late is one tap away on the detail page. Do not
// put the per-activity clocks back here.
//
// A `ListCard` with a link (long-press opens it in a new tab). Nothing inside it is interactive.

interface OrderCardProps {
  order: Order
}

const OrderCard = ({ order }: OrderCardProps) => {
  const activities = orderedActivities(order.activities)
  const reference = order.notes?.trim()

  return (
    <ListCard
      to={`/orders/${order.id}`}
      title={order.code ?? '—'}
      badges={
        <>
          {order.isPriority && (
            <span className="badge status-pill status-pill--progress" title="Atención prioritaria">
              <Icon name="priority" className="status-pill__icon" />
              <span className="visually-hidden">Prioritaria</span>
            </span>
          )}
          <OrderStatusBadge status={order.status} />
        </>
      }
      amount={fmtMoney(order.total)}
      meta={
        <>
          <ElapsedNote iso={statusClock(order)} status={order.status} />
          <span>{order.branch.name}</span>
          <span>{fmtDate(order.createdAt)}</span>
        </>
      }
    >
      {/* Client and reference on one line: the reference is what tells two jobs of the same client
          apart, and it is the part that truncates. */}
      <div className="text-truncate mt-1" {...MASK}>
        {clientName(order.client)}
        {reference && <span className="text-body-secondary"> · {reference}</span>}
      </div>

      {activities.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {activities.map((activity) => (
            <ActivityBadge key={activity.type} activity={activity} />
          ))}
        </div>
      )}
    </ListCard>
  )
}

export default OrderCard
