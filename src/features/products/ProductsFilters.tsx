import { useMemo } from 'react'

import { FilterSection } from 'src/shared/components/FilterMenu'
import ListFilters from 'src/shared/components/ListFilters'
import FilterCheckboxList, { type FilterOption } from 'src/shared/components/FilterCheckboxList'
import FilterActiveSection from 'src/shared/components/FilterActiveSection'
import FilterSortSection, { type ListSort } from 'src/shared/components/FilterSortSection'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { useFilterSheet } from 'src/shared/hooks/useFilterSheet'
import { CFormSelect } from '@coreui/react'
import { useAllProductFamilies } from 'src/features/productFamilies/useProductFamilies'
import { prunedSubtypes, subtypeLabel, subtypeOptionsFor } from './productSubtypes'
import { useProductsTotal } from './useProducts'
import type { ProductListParams, ProductType } from './types'

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
  // The design family, as a string because it travels in the URL. '' = no
  // filter; 'none' = the assignment queue (products that belong to no family),
  // which a query string cannot express as a null.
  family: string
  sort: ListSort
}

type OnFilterChange = <K extends keyof ProductsFilterValues>(
  key: K,
  value: ProductsFilterValues[K],
) => void

interface ProductsFilterFieldsProps {
  values: ProductsFilterValues
  onChange: OnFilterChange
}

// The fields alone, bound to the URL by the dropdown and to a draft by the phone's sheet.
const ProductsFilterFields = ({ values, onChange }: ProductsFilterFieldsProps) => {
  const subtypeOptions = useMemo(() => subtypeOptionsFor(values.type), [values.type])
  const { data: families = [] } = useAllProductFamilies()

  return (
    <>
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

      <FilterSection label="Familia">
        <div className="px-3 py-1">
          <CFormSelect
            size="sm"
            aria-label="Familia"
            value={values.family}
            onChange={(e) => onChange('family', e.target.value)}
          >
            <option value="">Todas</option>
            <option value="none">Sin familia</option>
            {families.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.name}
              </option>
            ))}
          </CFormSelect>
        </div>
      </FilterSection>

      <FilterActiveSection
        value={values.isActive}
        onChange={(next) => onChange('isActive', next)}
      />
      <FilterSortSection value={values.sort} onChange={(next) => onChange('sort', next)} />
    </>
  )
}

// Sin filtros, keeping the order: «Limpiar» never touched it on the dropdown either.
const cleared = (values: ProductsFilterValues): ProductsFilterValues => ({
  type: [],
  subtype: [],
  isActive: '',
  family: '',
  sort: values.sort,
})

// What the listing asks the API for a set of values, less the page and its order. Shared by the
// page's query and the sheet's count, so «Ver 12 productos» is the list it opens.
export const productFilterParams = (
  values: ProductsFilterValues,
  search: string,
): ProductListParams => ({
  search: search || undefined,
  type: values.type.length ? values.type : undefined,
  subtype: values.subtype.length ? values.subtype : undefined,
  isActive: values.isActive ? values.isActive === 'true' : undefined,
  // 'none' is the assignment queue. Two API parameters rather than one nullable filter, because a
  // query string cannot carry a null.
  familyId: values.family && values.family !== 'none' ? Number(values.family) : undefined,
  unassigned: values.family === 'none' ? true : undefined,
})

interface ProductsFiltersProps {
  values: ProductsFilterValues
  // The search box's term: not a field of the panel, but part of what the sheet's count asks.
  search: string
  onChange: OnFilterChange
  onApply: (values: ProductsFilterValues) => void
  onClear: () => void
}

const ProductsFilters = ({ values, search, onChange, onApply, onClear }: ProductsFiltersProps) => {
  const sheet = useFilterSheet(values)
  const total = useProductsTotal(productFilterParams(sheet.draft, search), sheet.visible)

  // Narrowing the types strands the subtypes that no longer belong to them. In the draft both move
  // at once, as the page's own handler does for the URL.
  const updateDraft: OnFilterChange = (key, value) => {
    if (key === 'type') {
      const type = value as ProductType[]
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
      cleared={cleared}
      activeCount={activeCount}
      resultCount={total.data}
      isCounting={total.isFetching}
      noun={{ one: 'producto', other: 'productos' }}
      renderFields={(v, change) => <ProductsFilterFields values={v} onChange={change} />}
    />
  )
}

export default ProductsFilters

export { prunedSubtypes }

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: ProductsFilterValues): number =>
  values.type.length + values.subtype.length + (values.isActive ? 1 : 0) + (values.family ? 1 : 0)

// The chips mirror `activeCount` field by field, so what the badge counts is always what the row
// below it lists. A plain function: every label is already in hand, nothing is carried as an id.
export const productsFilterChips = (
  values: ProductsFilterValues,
  onChange: <K extends keyof ProductsFilterValues>(key: K, value: ProductsFilterValues[K]) => void,
  familyName?: string,
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

  if (values.family) {
    chips.push({
      key: 'family',
      // The chip carries the id when the name isn't in hand: the filter menu owns
      // the family list, and a chip is not worth a second fetch of it.
      label: values.family === 'none' ? 'Sin familia' : (familyName ?? 'Familia'),
      onRemove: () => onChange('family', ''),
    })
  }
  return chips
}
