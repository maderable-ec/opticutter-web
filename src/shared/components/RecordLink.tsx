import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useFromHere } from 'src/shared/hooks/useShellNav'

interface RecordLinkProps {
  to: string
  children: ReactNode
}

// The code of a listing row as a real link to its record. The whole row still opens it on a click,
// but a row is no stop for the keyboard: with nothing focusable in it, the listings could only be
// opened with a mouse, and axe flagged the tables that scroll sideways as a region nobody could
// reach. The link is that stop, and a middle click or a long-press opens the record in a new tab.
//
// It stops the click from reaching the row, which would navigate a second time to the same place.
// It carries this screen as the record's origin, so the record's «Volver» comes back here.
const RecordLink = ({ to, children }: RecordLinkProps) => {
  const fromHere = useFromHere()
  return (
    <Link to={to} state={fromHere} className="record-link" onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  )
}

export default RecordLink
