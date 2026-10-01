import { FilterSection } from 'src/shared/components/FilterMenu'
import ListFilters from 'src/shared/components/ListFilters'
import FilterCheckboxList, { type FilterOption } from 'src/shared/components/FilterCheckboxList'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { useFilterSheet } from 'src/shared/hooks/useFilterSheet'
import {
  prunedSubtypes,
  subtypeLabel,
  subtypeOptionsFor,
} from 'src/features/products/productSubtypes'
import type { Branch } from 'src/features/branches/types'
import type { LowStockFilterValues } from './lowStock'
import { filterLowStock } from './lowStock'
import type { LowStockItem } from './types'

const TYPE_LABELS: Record<LowStockItem['type'], string> = {
  board: 'Tablero',
  edge_banding: 'Tapacanto',
}

const TYPE_OPTIONS: FilterOption<LowStockItem['type']>[] = (
  Object.keys(TYPE_LABELS) as LowStockItem['type'][]
).map((value) => ({ value, label: TYPE_LABELS[value] }))

export type { LowStockFilterValues }

type OnFilterChange = <K extends keyof LowStockFilterValues>(
  key: K,
  value: LowStockFilterValues[K],
) => void

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
const LowStockFilterFields = ({
  values,
  branches,
  onChange,
}: {
  values: LowStockFilterValues
  branches: Branch[]
  onChange: OnFilterChange
}) => (
  <>
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
  </>
)

interface LowStockFiltersProps {
  values: LowStockFilterValues
  search: string
  // The whole report, for the sheet's count: nothing is fetched to answer it.
  items: LowStockItem[]
  branches: Branch[]
  onChange: OnFilterChange
  onApply: (values: LowStockFilterValues) => void
  onClear: () => void
}

const LowStockFilters = ({
  values,
  search,
  items,
  branches,
  onChange,
  onApply,
  onClear,
}: LowStockFiltersProps) => {
  const sheet = useFilterSheet(values)

  // Narrowing the types strands the subtypes that no longer belong to them. In the draft both move
  // at once, as the page's own handler does for the URL.
  const updateDraft: OnFilterChange = (key, value) => {
    if (key === 'type') {
      const type = value as LowStockItem['type'][]
      sheet.replace({ ...sheet.draft, type, subtype: prunedSubtypes(type, sheet.draft.subtype) })
      return
    }
    sheet.update(key, value)
  }

  return (
    <ListFilters
      values={values}
      onChange={onChange}
      onClear={onClear}
      sheet={{ ...sheet, update: updateDraft }}
      onApply={onApply}
      cleared={() => ({ branch: [], type: [], subtype: [] })}
      activeCount={activeCount}
      resultCount={filterLowStock(items, sheet.draft, search).length}
      noun={{ one: 'producto', other: 'productos' }}
      renderFields={(v, change) => (
        <LowStockFilterFields values={v} branches={branches} onChange={change} />
      )}
    />
  )
}

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
