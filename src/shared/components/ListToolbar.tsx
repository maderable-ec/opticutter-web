import type { ReactNode } from 'react'

interface ListToolbarProps {
  // The search box first — it grows to 360px, and takes a row of its own on a phone — then the
  // filters, then the actions (give their wrapper `ms-auto` to push them to the far end).
  children: ReactNode
}

// A listing's one toolbar row: search · filters · actions. The same markup was copied into nine
// pages with the search's width repeated inline in each; the layout, and what it does on a phone,
// lives here now.
const ListToolbar = ({ children }: ListToolbarProps) => (
  <div className="list-toolbar">{children}</div>
)

export default ListToolbar
