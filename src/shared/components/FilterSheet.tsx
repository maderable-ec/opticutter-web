import type { ReactNode } from 'react'
import {
  CBadge,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFilter } from '@coreui/icons'

interface FilterSheetProps {
  // Filters APPLIED right now, for the trigger's badge — same count `FilterMenu` shows.
  activeCount: number
  visible: boolean
  onOpen: () => void
  onClose: () => void
  onApply: () => void
  // Clears the draft only; nothing reaches the list until "Ver".
  onClear: () => void
  // Filters set in the draft: decides whether "Limpiar" has anything to do.
  draftCount: number
  // How many rows the draft would return. `undefined` until the first count arrives.
  resultCount?: number
  isCounting?: boolean
  // "orden" / "órdenes", for the apply button.
  noun: { one: string; other: string }
  children: ReactNode
}

/**
 * The filter panel on a phone: a trigger that looks like `FilterMenu`'s, and a full-screen sheet
 * behind it. `FilterMenu` stays the panel from `md` up; the listing mounts both and the breakpoint
 * picks.
 *
 * Why not the dropdown on a phone: it opened as a popover over the list with its own 70vh scroll
 * inside the page's, every tap refetched a list hidden behind it, and the only way out was a tap
 * "somewhere outside" — there was no button that said "done". The sheet has one scroll, a clear
 * way out on each end (✕ discards, the primary applies) and a primary that says what applying will
 * give: "Ver 37 órdenes". That count is what stops a filter combination from being discovered
 * empty only after the panel is gone.
 *
 * The fields are the SAME components the dropdown renders, bound to a draft (`useFilterSheet`).
 * They style themselves as `.dropdown-item`/`.dropdown-header`, whose variables CoreUI only defines
 * on `.dropdown-menu` — hence the static `.dropdown-menu` wrapper, which `.filter-sheet` in
 * style.scss then enlarges for a finger (and to 16px text, below which iOS zooms in on focus).
 */
const FilterSheet = ({
  activeCount,
  visible,
  onOpen,
  onClose,
  onApply,
  onClear,
  draftCount,
  resultCount,
  isCounting = false,
  noun,
  children,
}: FilterSheetProps) => {
  const applyLabel =
    resultCount === undefined
      ? 'Ver resultados'
      : `Ver ${resultCount} ${resultCount === 1 ? noun.one : noun.other}`

  return (
    <>
      <CButton
        color="secondary"
        variant="outline"
        className="d-flex align-items-center gap-2"
        onClick={onOpen}
      >
        <CIcon icon={cilFilter} />
        Filtros
        {activeCount > 0 && (
          <CBadge color="primary" shape="rounded-pill">
            {activeCount}
          </CBadge>
        )}
      </CButton>

      <CModal visible={visible} onClose={onClose} fullscreen className="filter-sheet">
        <CModalHeader>
          <CModalTitle>Filtros</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-0">
          <div className="dropdown-menu show position-static w-100 border-0 rounded-0 shadow-none py-2">
            {children}
          </div>
        </CModalBody>
        <CModalFooter className="filter-sheet__footer">
          <CButton color="link" onClick={onClear} disabled={draftCount === 0}>
            Limpiar
          </CButton>
          <CButton color="primary" className="flex-grow-1" onClick={onApply}>
            {isCounting && <CSpinner size="sm" className="me-2" aria-hidden="true" />}
            {applyLabel}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FilterSheet
