import { useState } from 'react'
import { CFormInput, CFormSelect } from '@coreui/react'

import FilterMenu, { FilterSection } from 'src/shared/components/FilterMenu'
import FilterCheckboxList from 'src/shared/components/FilterCheckboxList'
import FilterSearchPicker from 'src/shared/components/FilterSearchPicker'
import type { FilterChip } from 'src/shared/components/FilterChips'
import { clientName } from 'src/shared/utils/format'
import { fmtDay } from 'src/shared/utils/date'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { useClient, useClientsMin } from 'src/features/clients/useClients'
import { ORDER_STATUS_VALUES, statusLabel } from './status'
import type { BandingStatus, OrderSort, OrderStatus } from './types'

const STATUS_OPTIONS = ORDER_STATUS_VALUES.map((value) => ({ value, label: statusLabel(value) }))

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Solo prioritarias' },
  { value: 'false', label: 'Solo normales' },
]

const SORT_OPTIONS: { value: OrderSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes primero' },
  { value: 'oldest', label: 'Más antiguas primero' },
  // The control view: longest sitting in its current status first, closed ones last. Not the
  // default — the page is a finder before it is a monitor, and this reorders what people
  // have memorised.
  { value: 'stalest', label: 'Más estancadas primero' },
]

// '' = both. `not_applicable` is offered because "orders with no canto at all" is a real
// question at the counter, not only a gap in the data.
const BANDING_OPTIONS: { value: BandingStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Canteado pendiente' },
  { value: 'in_progress', label: 'Canteando' },
  { value: 'done', label: 'Canteado listo' },
  { value: 'not_applicable', label: 'Sin canteado' },
]

const BANDING_LABEL: Record<string, string> = Object.fromEntries(
  BANDING_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
)

export interface OrdersFilterValues {
  status: OrderStatus[]
  clientId: string
  branchId: string
  createdFrom: string
  createdTo: string
  sort: OrderSort
  // '' = all; 'true'/'false' narrow to prioritized / regular. A string, like clientId and branchId,
  // so it rides the URL without a third representation of "unset".
  isPriority: string
  // '' = every stage of the parallel banding track.
  bandingStatus: BandingStatus | ''
}

interface OrdersFiltersProps {
  values: OrdersFilterValues
  onChange: <K extends keyof OrdersFilterValues>(key: K, value: OrdersFilterValues[K]) => void
  onClear: () => void
  // Global roles (admin/vendedor) choose a branch; the operador is scoped to theirs by the backend,
  // so for them the field is not disabled — it does not exist, and never counts as a filter.
  showBranch: boolean
}

// The filter panel for /orders plus the chips describing it. Kept out of OrdersPage so the page
// stays the shape of a page; ProductsPage is 450 lines mostly because its filter logic lives inline.
const OrdersFilters = ({ values, onChange, onClear, showBranch }: OrdersFiltersProps) => {
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

  return (
    <FilterMenu activeCount={activeCount(values, showBranch)} onClear={onClear}>
      <FilterSection label="Estado">
        <FilterCheckboxList
          values={values.status}
          options={STATUS_OPTIONS}
          onChange={(next) => onChange('status', next)}
        />
      </FilterSection>

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

      <FilterSection label="Prioridad">
        <div className="px-3 py-1">
          <CFormSelect
            size="sm"
            value={values.isPriority}
            onChange={(e) => onChange('isPriority', e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
        </div>
      </FilterSection>

      <FilterSection label="Canteado">
        <div className="px-3 py-1">
          <CFormSelect
            size="sm"
            value={values.bandingStatus}
            onChange={(e) => onChange('bandingStatus', e.target.value as BandingStatus | '')}
          >
            {BANDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
        </div>
      </FilterSection>

      <FilterSection label="Creada entre">
        <div className="px-3 py-1 d-flex gap-2">
          <CFormInput
            size="sm"
            type="date"
            aria-label="Desde"
            value={values.createdFrom}
            max={values.createdTo || undefined}
            onChange={(e) => onChange('createdFrom', e.target.value)}
          />
          <CFormInput
            size="sm"
            type="date"
            aria-label="Hasta"
            value={values.createdTo}
            min={values.createdFrom || undefined}
            onChange={(e) => onChange('createdTo', e.target.value)}
          />
        </div>
      </FilterSection>

      <FilterSection label="Orden">
        <div className="px-3 py-1">
          <CFormSelect
            size="sm"
            value={values.sort}
            onChange={(e) => onChange('sort', e.target.value as OrderSort)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
        </div>
      </FilterSection>
    </FilterMenu>
  )
}

export default OrdersFilters

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: OrdersFilterValues, showBranch: boolean): number =>
  values.status.length +
  (values.clientId ? 1 : 0) +
  (showBranch && values.branchId ? 1 : 0) +
  (values.createdFrom ? 1 : 0) +
  (values.createdTo ? 1 : 0) +
  (values.isPriority ? 1 : 0) +
  (values.bandingStatus ? 1 : 0)

// The chips mirror `activeCount` field by field, so what the badge counts is always what the row
// below it lists. A hook rather than a pure function because two of the labels have to be looked
// up: the URL carries ids, and "Cliente: 7" is not a filter anyone can read. Both lookups are the
// same queries the panel runs, so React Query serves them from cache — no extra request.
export const useOrdersFilterChips = (
  values: OrdersFilterValues,
  showBranch: boolean,
  onChange: <K extends keyof OrdersFilterValues>(key: K, value: OrdersFilterValues[K]) => void,
): FilterChip[] => {
  const { data: branches = [] } = useActiveBranches()
  const { data: selectedClient } = useClient(values.clientId || undefined)

  const chips: FilterChip[] = values.status.map((s) => ({
    key: `status:${s}`,
    label: statusLabel(s),
    onRemove: () =>
      onChange(
        'status',
        values.status.filter((v) => v !== s),
      ),
  }))

  if (values.clientId) {
    chips.push({
      key: 'clientId',
      label: `Cliente: ${selectedClient ? clientName(selectedClient) : values.clientId}`,
      onRemove: () => onChange('clientId', ''),
    })
  }
  if (showBranch && values.branchId) {
    const branch = branches.find((b) => String(b.id) === values.branchId)
    chips.push({
      key: 'branchId',
      label: `Sucursal: ${branch?.name ?? values.branchId}`,
      onRemove: () => onChange('branchId', ''),
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
  if (values.isPriority) {
    chips.push({
      key: 'isPriority',
      label: values.isPriority === 'true' ? 'Solo prioritarias' : 'Solo normales',
      onRemove: () => onChange('isPriority', ''),
    })
  }
  if (values.bandingStatus) {
    chips.push({
      key: 'bandingStatus',
      label: `Canteado: ${BANDING_LABEL[values.bandingStatus]}`,
      onRemove: () => onChange('bandingStatus', ''),
    })
  }
  return chips
}
