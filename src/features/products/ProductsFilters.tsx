import { useMemo } from 'react'

import FilterMenu, { FilterSection } from 'src/shared/components/FilterMenu'
import FilterCheckboxList, { type FilterOption } from 'src/shared/components/FilterCheckboxList'
import FilterActiveSection from 'src/shared/components/FilterActiveSection'
import FilterSortSection, { type ListSort } from 'src/shared/components/FilterSortSection'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { prunedSubtypes, subtypeLabel, subtypeOptionsFor } from './productSubtypes'
import type { ProductType } from './types'

const TYPE_LABELS: Record<ProductType, string> = {
  board: 'Tablero',
  edge_banding: 'Tapacanto',
}

const TYPE_OPTIONS: FilterOption<ProductType>[] = (Object.keys(TYPE_LABELS) as ProductType[]).map(
  (value) => ({ value, label: TYPE_LABELS[value] }),
)

export interface ProductsFilterValues {
  type: ProductType[]
  subtype: string[]
  isActive: string
  sort: ListSort
}

interface ProductsFiltersProps {
  values: ProductsFilterValues
  onChange: <K extends keyof ProductsFilterValues>(key: K, value: ProductsFilterValues[K]) => void
  onClear: () => void
}

const ProductsFilters = ({ values, onChange, onClear }: ProductsFiltersProps) => {
  const subtypeOptions = useMemo(() => subtypeOptionsFor(values.type), [values.type])

  return (
    <FilterMenu activeCount={activeCount(values)} onClear={onClear}>
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
          options={subtypeOptions}
          onChange={(next) => onChange('subtype', next)}
        />
      </FilterSection>

      <FilterActiveSection
        value={values.isActive}
        onChange={(next) => onChange('isActive', next)}
      />
      <FilterSortSection value={values.sort} onChange={(next) => onChange('sort', next)} />
    </FilterMenu>
  )
}

export default ProductsFilters

export { prunedSubtypes }

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: ProductsFilterValues): number =>
  values.type.length + values.subtype.length + (values.isActive ? 1 : 0)

// The chips mirror `activeCount` field by field, so what the badge counts is always what the row
// below it lists. A plain function: every label is already in hand, nothing is carried as an id.
export const productsFilterChips = (
  values: ProductsFilterValues,
  onChange: <K extends keyof ProductsFilterValues>(key: K, value: ProductsFilterValues[K]) => void,
): FilterChip[] => {
  const chips: FilterChip[] = values.type.map((t) => ({
    key: `type:${t}`,
    label: TYPE_LABELS[t],
    onRemove: () =>
      onChange(
        'type',
        values.type.filter((v) => v !== t),
      ),
  }))

  values.subtype.forEach((s) => {
    chips.push({
      key: `subtype:${s}`,
      label: subtypeLabel(s),
      onRemove: () =>
        onChange(
          'subtype',
          values.subtype.filter((v) => v !== s),
        ),
    })
  })

  if (values.isActive) {
    chips.push({
      key: 'isActive',
      label: values.isActive === 'true' ? 'Solo activos' : 'Solo inactivos',
      onRemove: () => onChange('isActive', ''),
    })
  }
  return chips
}
