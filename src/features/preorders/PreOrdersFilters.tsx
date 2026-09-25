import { useState } from 'react'
import { CFormInput, CFormSelect } from '@coreui/react'

import FilterMenu, { FilterSection } from 'src/shared/components/FilterMenu'
import FilterSheet from 'src/shared/components/FilterSheet'
import FilterCheckboxList from 'src/shared/components/FilterCheckboxList'
import FilterSearchPicker from 'src/shared/components/FilterSearchPicker'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { useFilterSheet } from 'src/shared/hooks/useFilterSheet'
import { clientName } from 'src/shared/utils/format'
import { fmtDay } from 'src/shared/utils/date'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { useClient, useClientsMin } from 'src/features/clients/useClients'
import { PREORDER_STATUS_VALUES, statusLabel } from './status'
import { usePreOrdersTotal } from './usePreOrders'
import type { PreOrderListParams, PreOrderSort, PreOrderStatus } from './types'

const STATUS_OPTIONS = PREORDER_STATUS_VALUES.map((value) => ({ value, label: statusLabel(value) }))

const SORT_OPTIONS: { value: PreOrderSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes primero' },
  { value: 'oldest', label: 'Más antiguas primero' },
]

export interface PreOrdersFilterValues {
  status: PreOrderStatus[]
  clientId: string
  branchId: string
  createdFrom: string
  createdTo: string
  sort: PreOrderSort
}

type OnFilterChange = <K extends keyof PreOrdersFilterValues>(
  key: K,
  value: PreOrdersFilterValues[K],
) => void

interface PreOrdersFilterFieldsProps {
  values: PreOrdersFilterValues
  onChange: OnFilterChange
  // Global roles (admin/vendedor) choose a branch; the operador is scoped to theirs by the backend,
  // so for them the field is not disabled — it does not exist, and never counts as a filter.
  showBranch: boolean
}

// The fields alone — the same five as the orders panel, since a quote and an order are looked for
// by the same handles. Bound to the URL by the dropdown and to a draft by the phone's sheet.
const PreOrdersFilterFields = ({ values, onChange, showBranch }: PreOrdersFilterFieldsProps) => {
  const [clientTerm, setClientTerm] = useState('')

  const { data: branches = [] } = useActiveBranches()
  const { data: clientsData, isLoading: clientsLoading } = useClientsMin(clientTerm)
  // The URL carries only the id; on a cold load this is what puts a name on the chip.
  const { data: selectedClient } = useClient(values.clientId || undefined)

  const clientOptions = (clientsData?.items ?? []).map((c) => ({
    value: String(c.id),
    label: clientName(c),
    sublabel: c.identifier ? `@${c.identifier}` : undefined,
  }))

  // Sucursal, cliente y fecha first: they are the handles the office narrows by before anything
  // else. Status and the rest follow in their old order, and the chips list them the same way.
  return (
    <>
      {showBranch && (
        <FilterSection label="Sucursal">
          <div className="px-3 py-1">
            <CFormSelect
              size="sm"
              value={values.branchId}
              onChange={(e) => onChange('branchId', e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </CFormSelect>
          </div>
        </FilterSection>
      )}

      <FilterSection label="Cliente">
        <FilterSearchPicker
          value={values.clientId}
          selectedLabel={selectedClient ? clientName(selectedClient) : undefined}
          options={clientOptions}
          isLoading={clientsLoading}
          onSearch={setClientTerm}
          onChange={(next) => onChange('clientId', next)}
          searchPlaceholder="Buscar cliente…"
          emptyText="Ningún cliente coincide"
        />
      </FilterSection>

      <FilterSection label="Creada entre">
        {/* The visible "Desde"/"Hasta" are for the phone's sheet: an empty native date field
            there shows no placeholder at all, so two blank boxes side by side said nothing about
            which end was which. The dropdown keeps its tighter look. */}
        <div className="px-3 py-1 d-flex gap-2">
          <label className="d-block flex-grow-1" style={{ flexBasis: 0, minWidth: 0 }}>
            <span className="d-block d-md-none small text-body-secondary mb-1">Desde</span>
            <CFormInput
              size="sm"
              type="date"
              aria-label="Desde"
              value={values.createdFrom}
              max={values.createdTo || undefined}
              onChange={(e) => onChange('createdFrom', e.target.value)}
            />
          </label>
          <label className="d-block flex-grow-1" style={{ flexBasis: 0, minWidth: 0 }}>
            <span className="d-block d-md-none small text-body-secondary mb-1">Hasta</span>
            <CFormInput
              size="sm"
              type="date"
              aria-label="Hasta"
              value={values.createdTo}
              min={values.createdFrom || undefined}
              onChange={(e) => onChange('createdTo', e.target.value)}
            />
          </label>
        </div>
      </FilterSection>

      <FilterSection label="Estado">
        <FilterCheckboxList
          values={values.status}
          options={STATUS_OPTIONS}
          onChange={(next) => onChange('status', next)}
        />
      </FilterSection>

      <FilterSection label="Orden">
        <div className="px-3 py-1">
          <CFormSelect
            size="sm"
            value={values.sort}
            onChange={(e) => onChange('sort', e.target.value as PreOrderSort)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
        </div>
      </FilterSection>
    </>
  )
}

// Sin filtros, keeping the sort: "Limpiar" never touched the order on the dropdown either.
const cleared = (values: PreOrdersFilterValues): PreOrdersFilterValues => ({
  status: [],
  clientId: '',
  branchId: '',
  createdFrom: '',
  createdTo: '',
  sort: values.sort,
})

// The listing's filter params for a set of values — everything but the page and its order. Shared
// by the page's query and the sheet's result count, so the two always ask the same question.
export const preorderFilterParams = (
  values: PreOrdersFilterValues,
  search: string,
): PreOrderListParams => ({
  search: search || undefined,
  status: values.status.length ? values.status : undefined,
  clientId: values.clientId ? Number(values.clientId) : undefined,
  branchId: values.branchId ? Number(values.branchId) : undefined,
  createdFrom: values.createdFrom || undefined,
  createdTo: values.createdTo || undefined,
})

interface PreOrdersFiltersProps {
  values: PreOrdersFilterValues
  // The search box's term: not a field of the panel, but part of what the sheet's count asks.
  search: string
  // Desktop: every change lands in the URL at once.
  onChange: OnFilterChange
  // Phone: the whole draft at once, when the sheet is applied.
  onApply: (values: PreOrdersFilterValues) => void
  onClear: () => void
  showBranch: boolean
}

// The filter panel for /preorders plus the chips describing it. Two panels over one set of fields,
// and the breakpoint picks: the dropdown from `md` up, `FilterSheet` below it — as on /orders.
const PreOrdersFilters = ({
  values,
  search,
  onChange,
  onApply,
  onClear,
  showBranch,
}: PreOrdersFiltersProps) => {
  const sheet = useFilterSheet(values)
  const total = usePreOrdersTotal(preorderFilterParams(sheet.draft, search), sheet.visible)

  return (
    <>
      <div className="d-none d-md-block">
        <FilterMenu activeCount={activeCount(values, showBranch)} onClear={onClear}>
          <PreOrdersFilterFields values={values} onChange={onChange} showBranch={showBranch} />
        </FilterMenu>
      </div>
      <div className="d-md-none">
        <FilterSheet
          activeCount={activeCount(values, showBranch)}
          visible={sheet.visible}
          onOpen={sheet.open}
          onClose={sheet.close}
          onApply={() => onApply(sheet.draft)}
          onClear={() => sheet.replace(cleared(sheet.draft))}
          draftCount={activeCount(sheet.draft, showBranch)}
          resultCount={total.data}
          isCounting={total.isFetching}
          noun={{ one: 'cotización', other: 'cotizaciones' }}
        >
          <PreOrdersFilterFields
            values={sheet.draft}
            onChange={sheet.update}
            showBranch={showBranch}
          />
        </FilterSheet>
      </div>
    </>
  )
}

export default PreOrdersFilters

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: PreOrdersFilterValues, showBranch: boolean): number =>
  (showBranch && values.branchId ? 1 : 0) +
  (values.clientId ? 1 : 0) +
  (values.createdFrom ? 1 : 0) +
  (values.createdTo ? 1 : 0) +
  values.status.length

// The chips mirror `activeCount` field by field, so what the badge counts is always what the row
// below it lists. A hook rather than a pure function because two of the labels have to be looked
// up: the URL carries ids, and "Cliente: 7" is not a filter anyone can read. Both lookups are the
// same queries the panel runs, so React Query serves them from cache — no extra request.
export const usePreOrdersFilterChips = (
  values: PreOrdersFilterValues,
  showBranch: boolean,
  onChange: <K extends keyof PreOrdersFilterValues>(
    key: K,
    value: PreOrdersFilterValues[K],
  ) => void,
): FilterChip[] => {
  const { data: branches = [] } = useActiveBranches()
  const { data: selectedClient } = useClient(values.clientId || undefined)

  const chips: FilterChip[] = []

  if (showBranch && values.branchId) {
    const branch = branches.find((b) => String(b.id) === values.branchId)
    chips.push({
      key: 'branchId',
      label: `Sucursal: ${branch?.name ?? values.branchId}`,
      onRemove: () => onChange('branchId', ''),
    })
  }
  if (values.clientId) {
    chips.push({
      key: 'clientId',
      label: `Cliente: ${selectedClient ? clientName(selectedClient) : values.clientId}`,
      onRemove: () => onChange('clientId', ''),
      private: true,
    })
  }
  if (values.createdFrom) {
    chips.push({
      key: 'createdFrom',
      label: `Desde: ${fmtDay(values.createdFrom)}`,
      onRemove: () => onChange('createdFrom', ''),
    })
  }
  if (values.createdTo) {
    chips.push({
      key: 'createdTo',
      label: `Hasta: ${fmtDay(values.createdTo)}`,
      onRemove: () => onChange('createdTo', ''),
    })
  }
  values.status.forEach((s) => {
    chips.push({
      key: `status:${s}`,
      label: statusLabel(s),
      onRemove: () =>
        onChange(
          'status',
          values.status.filter((v) => v !== s),
        ),
    })
  })
  return chips
}
