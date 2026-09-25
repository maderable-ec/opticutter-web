import { Link } from 'react-router-dom'
import { CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBolt } from '@coreui/icons'

import { MASK } from 'src/shared/analytics'
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
// A real link rather than a row with an onClick: a long-press on a phone offers "open in a new tab",
// which is how somebody following several orders keeps the list. Nothing inside it is interactive.

interface OrderCardProps {
  order: Order
}

const OrderCard = ({ order }: OrderCardProps) => {
  const activities = orderedActivities(order.activities)
  const reference = order.notes?.trim()

  return (
    <Link to={`/orders/${order.id}`} className="order-card">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <strong>{order.code ?? '—'}</strong>
        {order.isPriority && (
          <CBadge color="warning" title="Atención prioritaria">
            <CIcon icon={cilBolt} size="sm" />
          </CBadge>
        )}
        <OrderStatusBadge status={order.status} />
        <strong className="ms-auto text-nowrap">{fmtMoney(order.total)}</strong>
      </div>

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

      {/* The separators are drawn by `.order-card__meta` rather than written here: the elapsed note
          renders nothing on a closed order and would leave a dangling "·". */}
      <div className="order-card__meta mt-1">
        <ElapsedNote iso={statusClock(order)} status={order.status} />
        <span>{order.branch.name}</span>
        <span>{fmtDate(order.createdAt)}</span>
      </div>
    </Link>
  )
}

export default OrderCard
