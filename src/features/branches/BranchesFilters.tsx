import ListFilters from 'src/shared/components/ListFilters'
import FilterActiveSection from 'src/shared/components/FilterActiveSection'
import FilterSortSection, { type ListSort } from 'src/shared/components/FilterSortSection'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { useFilterSheet } from 'src/shared/hooks/useFilterSheet'
import { useBranchesTotal } from './useBranches'
import type { BranchListParams } from './types'

export interface BranchesFilterValues {
  isActive: string
  sort: ListSort
}

type OnFilterChange = <K extends keyof BranchesFilterValues>(
  key: K,
  value: BranchesFilterValues[K],
) => void

// What the listing asks the API for a set of values, less the page and its order. Shared by the
// page's query and the sheet's count, so «Ver 2 sucursales» is the list it opens.
export const branchFilterParams = (
  values: BranchesFilterValues,
  search: string,
): BranchListParams => ({
  search: search || undefined,
  isActive: values.isActive ? values.isActive === 'true' : undefined,
})

interface BranchesFiltersProps {
  values: BranchesFilterValues
  search: string
  onChange: OnFilterChange
  onApply: (values: BranchesFilterValues) => void
  onClear: () => void
}

const BranchesFilters = ({ values, search, onChange, onApply, onClear }: BranchesFiltersProps) => {
  const sheet = useFilterSheet(values)
  const total = useBranchesTotal(branchFilterParams(sheet.draft, search), sheet.visible)

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
      noun={{ one: 'sucursal', other: 'sucursales' }}
      renderFields={(v, change) => (
        <>
          <FilterActiveSection
            value={v.isActive}
            onChange={(next) => change('isActive', next)}
            bothLabel="Activas e inactivas"
            activeLabel="Solo activas"
            inactiveLabel="Solo inactivas"
          />
          <FilterSortSection value={v.sort} onChange={(next) => change('sort', next)} />
        </>
      )}
    />
  )
}

export default BranchesFilters

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: BranchesFilterValues): number => (values.isActive ? 1 : 0)

export const branchesFilterChips = (
  values: BranchesFilterValues,
  onChange: <K extends keyof BranchesFilterValues>(key: K, value: BranchesFilterValues[K]) => void,
): FilterChip[] =>
  values.isActive
    ? [
        {
          key: 'isActive',
          label: values.isActive === 'true' ? 'Solo activas' : 'Solo inactivas',
          onRemove: () => onChange('isActive', ''),
        },
      ]
    : []
