import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'

import { NO_CAPTURE } from 'src/shared/analytics'

export interface FilterChip {
  // Stable identity for the chip (usually `${field}:${value}`).
  key: string
  label: string
  onRemove: () => void
  // The label names a person (the client filter). Session replay then records the chip as an empty
  // box: the label also rides in the remove button's aria-label, which text masking does not reach.
  private?: boolean
}

interface FilterChipsProps {
  chips: FilterChip[]
  onClearAll: () => void
}

// The visible half of the filter panel: the toggle's badge says HOW MANY filters are on, these say
// WHICH ones — and remove them without opening anything. Renders nothing when nothing is applied,
// so an unfiltered list keeps its full height.
const FilterChips = ({ chips, onClearAll }: FilterChipsProps) => {
  if (chips.length === 0) return null

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      {chips.map((chip) => (
        <span key={chip.key} className={chip.private ? `filter-chip ${NO_CAPTURE}` : 'filter-chip'}>
          <span className="text-truncate" style={{ maxWidth: 220 }}>
            {chip.label}
          </span>
          <button
            type="button"
            className="filter-chip-remove"
            aria-label={`Quitar filtro ${chip.label}`}
            onClick={chip.onRemove}
          >
            <CIcon icon={cilX} size="sm" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <CButton color="link" size="sm" className="px-1" onClick={onClearAll}>
          Limpiar todo
        </CButton>
      )}
    </div>
  )
}

export default FilterChips
