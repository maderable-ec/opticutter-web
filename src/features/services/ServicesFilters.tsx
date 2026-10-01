import ListFilters from 'src/shared/components/ListFilters'
import FilterActiveSection from 'src/shared/components/FilterActiveSection'
import FilterSortSection, { type ListSort } from 'src/shared/components/FilterSortSection'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { useFilterSheet } from 'src/shared/hooks/useFilterSheet'
import { useServicesTotal } from './useServices'
import type { AdditionalServiceListParams } from './types'

export interface ServicesFilterValues {
  isActive: string
  sort: ListSort
}

type OnFilterChange = <K extends keyof ServicesFilterValues>(
  key: K,
  value: ServicesFilterValues[K],
) => void

// What the listing asks the API for a set of values, less the page and its order. Shared by the
// page's query and the sheet's count, so «Ver 5 servicios» is the list it opens.
export const serviceFilterParams = (
  values: ServicesFilterValues,
  search: string,
): AdditionalServiceListParams => ({
  search: search || undefined,
  isActive: values.isActive ? values.isActive === 'true' : undefined,
})

interface ServicesFiltersProps {
  values: ServicesFilterValues
  search: string
  onChange: OnFilterChange
  onApply: (values: ServicesFilterValues) => void
  onClear: () => void
}

const ServicesFilters = ({ values, search, onChange, onApply, onClear }: ServicesFiltersProps) => {
  const sheet = useFilterSheet(values)
  const total = useServicesTotal(serviceFilterParams(sheet.draft, search), sheet.visible)

  return (
    <ListFilters
      values={values}
      onChange={onChange}
      onClear={onClear}
      sheet={sheet}
      onApply={onApply}
      cleared={(draft) => ({ isActive: '', sort: draft.sort })}
      activeCount={activeCount}
      resultCount={total.data}
      isCounting={total.isFetching}
      noun={{ one: 'servicio', other: 'servicios' }}
      renderFields={(v, change) => (
        <>
          <FilterActiveSection value={v.isActive} onChange={(next) => change('isActive', next)} />
          <FilterSortSection value={v.sort} onChange={(next) => change('sort', next)} />
        </>
      )}
    />
  )
}

export default ServicesFilters

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: ServicesFilterValues): number => (values.isActive ? 1 : 0)

// The chips mirror `activeCount` field by field, so what the badge counts is always what the row
// below it lists. A plain function here — unlike the orders/pre-orders panels, no label needs a
// lookup, because this listing filters by nothing that is carried as an id.
export const servicesFilterChips = (
  values: ServicesFilterValues,
  onChange: <K extends keyof ServicesFilterValues>(key: K, value: ServicesFilterValues[K]) => void,
): FilterChip[] =>
  values.isActive
    ? [
        {
          key: 'isActive',
          label: values.isActive === 'true' ? 'Solo activos' : 'Solo inactivos',
          onRemove: () => onChange('isActive', ''),
        },
      ]
    : []
