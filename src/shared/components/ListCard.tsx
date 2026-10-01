import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useFromHere } from 'src/shared/hooks/useShellNav'

interface ListCardProps {
  // A record with a page of its own is a real link: a long-press on a phone offers "open in a new
  // tab", which is how somebody following several records keeps the list. It carries this screen
  // as the record's origin, so the record's «Volver» comes back here (Inicio, a filtered list). One edited in a modal
  // passes `onClick` instead. With neither, the row is a plain reading (a report, a read-only
  // catalog) and nothing about it promises a tap.
  to?: string
  onClick?: () => void
  // The record's code or name, what the row is scanned for.
  title: ReactNode
  // Next to the title: the status pill, a priority mark.
  badges?: ReactNode
  // At the end of the first line: the figure the row is about (a total, a stock level).
  amount?: ReactNode
  // Middle lines: the client, the reference, the activities.
  children?: ReactNode
  // Last line of short facts. The separating dots are drawn by CSS, so an item that renders
  // nothing (an elapsed note on a closed order) never leaves one dangling.
  meta?: ReactNode
  // A control of its own beside the row — delete, the branch's «Activa» switch. It sits OUTSIDE the
  // row's link or button, since one interactive element cannot hold another.
  action?: ReactNode
}

// One row of a listing on a phone, in place of a table of six to eleven columns that scrolled
// sideways and hid the figure the row was about. A divided list rather than boxes: it already sits on
// a `.surface`, and a bordered card inside a bordered plane is a double frame per row. Wrap the rows
// in `.list-cards`.
const ListCard = ({
  to,
  onClick,
  title,
  badges,
  amount,
  children,
  meta,
  action,
}: ListCardProps) => {
  const fromHere = useFromHere()
  const body = (
    <>
      <div className="list-card__head">
        <strong className="list-card__title">{title}</strong>
        {badges}
        {amount != null && <strong className="list-card__amount">{amount}</strong>}
      </div>
      {children}
      {meta && <div className="list-card__meta">{meta}</div>}
    </>
  )

  const card = to ? (
    <Link to={to} state={fromHere} className="list-card">
      {body}
    </Link>
  ) : onClick ? (
    <button type="button" className="list-card" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="list-card list-card--static">{body}</div>
  )

  if (!action) return card
  return (
    <div className="list-card-row">
      {card}
      <div className="list-card__action">{action}</div>
    </div>
  )
}

export default ListCard
