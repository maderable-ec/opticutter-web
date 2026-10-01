import type { ReactNode } from 'react'

import FilterMenu from './FilterMenu'
import FilterSheet from './FilterSheet'
import type { useFilterSheet } from 'src/shared/hooks/useFilterSheet'

export type FilterChange<V> = <K extends keyof V>(key: K, value: V[K]) => void

interface ListFiltersProps<V extends object> {
  // The applied filters (the URL) and the write the dropdown makes on every change.
  values: V
  onChange: FilterChange<V>
  onClear: () => void
  // The phone's sheet, owned by the caller (`useFilterSheet`), and the one write that applies it.
  sheet: ReturnType<typeof useFilterSheet<V>>
  onApply: (values: V) => void
  // The same values without a filter, keeping what «Limpiar» keeps (the order).
  cleared: (values: V) => V
  activeCount: (values: V) => number
  // How many rows the draft would give, for «Ver 12 productos». `undefined` until it is known.
  resultCount?: number
  isCounting?: boolean
  noun: { one: string; other: string }
  // The fields, bound to the URL by the dropdown and to the draft by the sheet.
  renderFields: (values: V, onChange: FilterChange<V>) => ReactNode
}

// A listing's «Filtros», the dropdown from `md` up and `FilterSheet` below it, over ONE set of
// fields — the shape /orders and /preorders were built in, for the listings that come after them.
// Both panels are mounted and the breakpoint picks, like everywhere else on the phone.
const ListFilters = <V extends object>({
  values,
  onChange,
  onClear,
  sheet,
  onApply,
  cleared,
  activeCount,
  resultCount,
  isCounting,
  noun,
  renderFields,
}: ListFiltersProps<V>) => (
  <>
    <div className="d-none d-md-block">
      <FilterMenu activeCount={activeCount(values)} onClear={onClear}>
        {renderFields(values, onChange)}
      </FilterMenu>
    </div>
    <div className="d-md-none">
      <FilterSheet
        activeCount={activeCount(values)}
        visible={sheet.visible}
        onOpen={sheet.open}
        onClose={sheet.close}
        onApply={() => onApply(sheet.draft)}
        onClear={() => sheet.replace(cleared(sheet.draft))}
        draftCount={activeCount(sheet.draft)}
        resultCount={resultCount}
        isCounting={isCounting}
        noun={noun}
      >
        {renderFields(sheet.draft, sheet.update)}
      </FilterSheet>
    </div>
  </>
)

export default ListFilters
