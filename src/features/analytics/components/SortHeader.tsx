import type { ReactNode } from 'react'
import { CTableHeaderCell } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

export type Sort<K extends string> = { key: K; dir: 'asc' | 'desc' } | null

interface SortHeaderProps<K extends string> {
  sortKey: K
  sort: Sort<K>
  onSort: (key: K) => void
  className?: string
  children: ReactNode
}

// A sortable column head: a real button, so a keyboard reaches it, and `aria-sort` on the cell, so
// a screen reader hears which way the table is ordered. The ▲▼ glyphs it replaced were typed into
// the header's text on a `<th role="button">` with no way in from the keyboard.
const SortHeader = <K extends string>({
  sortKey,
  sort,
  onSort,
  className,
  children,
}: SortHeaderProps<K>) => {
  const active = sort?.key === sortKey
  return (
    <CTableHeaderCell
      scope="col"
      className={className}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {children}
        {active && (
          <Icon name={sort.dir === 'asc' ? 'sortAsc' : 'sortDesc'} className="sort-button__icon" />
        )}
      </button>
    </CTableHeaderCell>
  )
}

export default SortHeader
