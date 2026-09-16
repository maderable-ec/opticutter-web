import FilterMenu, { FilterSection } from 'src/shared/components/FilterMenu'
import FilterCheckboxList, { type FilterOption } from 'src/shared/components/FilterCheckboxList'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { subtypeLabel, subtypeOptionsFor } from 'src/features/products/productSubtypes'
import type { Branch } from 'src/features/branches/types'
import type { LowStockItem } from './types'

const TYPE_LABELS: Record<LowStockItem['type'], string> = {
  board: 'Tablero',
  edge_banding: 'Tapacanto',
}

const TYPE_OPTIONS: FilterOption<LowStockItem['type']>[] = (
  Object.keys(TYPE_LABELS) as LowStockItem['type'][]
).map((value) => ({ value, label: TYPE_LABELS[value] }))

export interface LowStockFilterValues {
  branch: string[]
  type: LowStockItem['type'][]
  subtype: string[]
}

interface LowStockFiltersProps {
  values: LowStockFilterValues
  branches: Branch[]
  onChange: <K extends keyof LowStockFilterValues>(key: K, value: LowStockFilterValues[K]) => void
  onClear: () => void
}

// Same panel as the product catalog's: one "Filtros" button, checkbox lists inside,
// chips underneath. Three sections: where the material is, what kind it is, and
// which material it is made of.
//
// The Subtipo options come from `productSubtypes`, the same source the catalog's
// filter uses — so the two screens offer the same list, scoped the same way to the
// selected type(s) and labelled in the same Spanish the shop floor speaks.
//
// The branch options come from the branch list and not from the report's own rows:
// a branch with everything well stocked has no rows, and disappearing from the
// filter is precisely what would stop somebody checking it.
const LowStockFilters = ({ values, branches, onChange, onClear }: LowStockFiltersProps) => (
  <FilterMenu activeCount={activeCount(values)} onClear={onClear}>
    <FilterSection label="Sucursal">
      <FilterCheckboxList
        values={values.branch}
        options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
        onChange={(next) => onChange('branch', next)}
      />
    </FilterSection>

    <FilterSection label="Tipo">
      <FilterCheckboxList
        values={values.type}
        options={TYPE_OPTIONS}
        onChange={(next) => onChange('type', next)}
      />
    </FilterSection>

    <FilterSection label="Subtipo">
      <FilterCheckboxList
        values={values.subtype}
        options={subtypeOptionsFor(values.type)}
        onChange={(next) => onChange('subtype', next)}
      />
    </FilterSection>
  </FilterMenu>
)

export default LowStockFilters

export const activeCount = (values: LowStockFilterValues): number =>
  values.branch.length + values.type.length + values.subtype.length

// The chips mirror `activeCount` field by field, so what the badge counts is always
// what the row below it lists.
export const lowStockFilterChips = (
  values: LowStockFilterValues,
  branches: Branch[],
  onChange: <K extends keyof LowStockFilterValues>(key: K, value: LowStockFilterValues[K]) => void,
): FilterChip[] => {
  const chips: FilterChip[] = values.branch.map((id) => ({
    key: `branch:${id}`,
    // Falls back to the id: a branch filtered in the URL and then deactivated is
    // still filtering, and a chip with no label would be one nobody can remove.
    label: branches.find((b) => String(b.id) === id)?.name ?? `Sucursal ${id}`,
    onRemove: () =>
      onChange(
        'branch',
        values.branch.filter((v) => v !== id),
      ),
  }))

  values.type.forEach((t) => {
    chips.push({
      key: `type:${t}`,
      label: TYPE_LABELS[t],
      onRemove: () =>
        onChange(
          'type',
          values.type.filter((v) => v !== t),
        ),
    })
  })

  values.subtype.forEach((st) => {
    chips.push({
      key: `subtype:${st}`,
      label: subtypeLabel(st),
      onRemove: () =>
        onChange(
          'subtype',
          values.subtype.filter((v) => v !== st),
        ),
    })
  })
  return chips
}
