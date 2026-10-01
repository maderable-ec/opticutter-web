import ListFilters from 'src/shared/components/ListFilters'
import FilterSortSection, { type ListSort } from 'src/shared/components/FilterSortSection'
import { useFilterSheet } from 'src/shared/hooks/useFilterSheet'
import { useClientsTotal } from './useClients'
import type { ClientListParams } from './types'

export interface ClientsFilterValues {
  sort: ListSort
}

// What the listing asks the API for a set of values, less the page and its order. Shared by the
// page's query and the sheet's count, so «Ver 37 clientes» is the list it opens.
export const clientFilterParams = (search: string): ClientListParams => ({
  search: search || undefined,
})

interface ClientsFiltersProps {
  values: ClientsFilterValues
  search: string
  onChange: <K extends keyof ClientsFilterValues>(key: K, value: ClientsFilterValues[K]) => void
  onApply: (values: ClientsFilterValues) => void
  onClear: () => void
}

// A client has no status, no owning branch and no type — the only thing to narrow by is the search
// box, which lives on the toolbar. So this panel holds ordering alone, and its badge is always 0:
// `sort` is never counted, here as everywhere, because it is always set to something.
const ClientsFilters = ({ values, search, onChange, onApply, onClear }: ClientsFiltersProps) => {
  const sheet = useFilterSheet(values)
  const total = useClientsTotal(clientFilterParams(search), sheet.visible)

  return (
    <ListFilters
      values={values}
      onChange={onChange}
      onClear={onClear}
      sheet={sheet}
      onApply={onApply}
      cleared={(draft) => draft}
      activeCount={() => 0}
      resultCount={total.data}
      isCounting={total.isFetching}
      noun={{ one: 'cliente', other: 'clientes' }}
      renderFields={(v, change) => (
        <FilterSortSection
          value={v.sort}
          onChange={(next) => change('sort', next)}
          nameLabel="Por apellido (A–Z)"
        />
      )}
    />
  )
}

export default ClientsFilters
