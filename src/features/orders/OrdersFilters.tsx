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
import { ORDER_STATUS_VALUES, statusLabel } from './status'
import { useOrdersTotal } from './useOrders'
import type { ActivityStatus, ActivityType, OrderListParams, OrderSort, OrderStatus } from './types'

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

// '' = every activity / every stage. The two mirror the API's pair, which is also the only way
// the question stays askable for the three activities without six options per stage.
//
// The old "Sin canteado" option is gone: it asked for the ABSENCE of a banding, and an activity
// that does not apply now has no row to filter on. "Canteado" (any stage) answers the useful
// half -- which orders carry banding at all.
const ACTIVITY_OPTIONS: { value: ActivityType | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'cutting', label: 'Corte' },
  { value: 'banding', label: 'Canteado' },
  { value: 'additional', label: 'Adicionales' },
]

const ACTIVITY_STATUS_OPTIONS: { value: ActivityStatus | ''; label: string }[] = [
  { value: '', label: 'Cualquier etapa' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Listo' },
]

const OPTION_LABEL = (options: { value: string; label: string }[], value: string): string =>
  options.find((o) => o.value === value)?.label ?? value

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
  // '' = every activity. Pairs with `activityStatus` to narrow the listing to one of the
  // three tracks at one stage — the same pair the Actividades column shows per row.
  activity: ActivityType | ''
  activityStatus: ActivityStatus | ''
}

type OnFilterChange = <K extends keyof OrdersFilterValues>(
  key: K,
  value: OrdersFilterValues[K],
) => void

interface OrdersFilterFieldsProps {
  values: OrdersFilterValues
  onChange: OnFilterChange
  // Global roles (admin/vendedor) choose a branch; the operador is scoped to theirs by the backend,
  // so for them the field is not disabled — it does not exist, and never counts as a filter.
  showBranch: boolean
}

// The fields alone, with no panel around them: the desktop dropdown binds them to the URL, the
// phone's sheet to a draft. One set of fields so the two can never offer different filters.
const OrdersFilterFields = ({ values, onChange, showBranch }: OrdersFilterFieldsProps) => {
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

      <FilterSection label="Trabajo de taller">
        <div className="px-3 py-1 d-flex gap-2">
          <CFormSelect
            size="sm"
            value={values.activity}
            onChange={(e) => onChange('activity', e.target.value as ActivityType | '')}
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
          <CFormSelect
            size="sm"
            value={values.activityStatus}
            onChange={(e) => onChange('activityStatus', e.target.value as ActivityStatus | '')}
          >
            {ACTIVITY_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
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
    </>
  )
}

// Sin filtros, keeping the sort: "Limpiar" never touched the order on the dropdown either.
const cleared = (values: OrdersFilterValues): OrdersFilterValues => ({
  status: [],
  clientId: '',
  branchId: '',
  createdFrom: '',
  createdTo: '',
  sort: values.sort,
  isPriority: '',
  activity: '',
  activityStatus: '',
})

/**
 * The listing's filter params for a set of values — everything but the page and its order. Shared
 * by the page's query and the sheet's result count, which must ask the same question or the
 * "Ver N órdenes" button would promise a number the list then does not show.
 */
export const orderFilterParams = (values: OrdersFilterValues, search: string): OrderListParams => ({
  search: search || undefined,
  status: values.status.length ? values.status : undefined,
  clientId: values.clientId ? Number(values.clientId) : undefined,
  branchId: values.branchId ? Number(values.branchId) : undefined,
  createdFrom: values.createdFrom || undefined,
  createdTo: values.createdTo || undefined,
  // '' means "both", and `false` is a real filter — so map through the empty string explicitly
  // rather than leaning on a falsy check, which would swallow "Solo normales".
  isPriority: values.isPriority === '' ? undefined : values.isPriority === 'true',
  activity: values.activity || undefined,
  activityStatus: values.activityStatus || undefined,
})

interface OrdersFiltersProps {
  values: OrdersFilterValues
  // The search box's term: not a field of the panel, but part of what the sheet's count asks.
  search: string
  // Desktop: every change lands in the URL at once.
  onChange: OnFilterChange
  // Phone: the whole draft at once, when the sheet is applied.
  onApply: (values: OrdersFilterValues) => void
  onClear: () => void
  showBranch: boolean
}

// The filter panel for /orders plus the chips describing it. Kept out of OrdersPage so the page
// stays the shape of a page; ProductsPage is 450 lines mostly because its filter logic lives inline.
//
// Two panels over one set of fields, and the breakpoint picks: the dropdown from `md` up, the
// full-screen `FilterSheet` below it (see that component for why a phone gets a different one).
const OrdersFilters = ({
  values,
  search,
  onChange,
  onApply,
  onClear,
  showBranch,
}: OrdersFiltersProps) => {
  const sheet = useFilterSheet(values)
  const total = useOrdersTotal(orderFilterParams(sheet.draft, search), sheet.visible)

  return (
    <>
      <div className="d-none d-md-block">
        <FilterMenu activeCount={activeCount(values, showBranch)} onClear={onClear}>
          <OrdersFilterFields values={values} onChange={onChange} showBranch={showBranch} />
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
          noun={{ one: 'orden', other: 'órdenes' }}
        >
          <OrdersFilterFields
            values={sheet.draft}
            onChange={sheet.update}
            showBranch={showBranch}
          />
        </FilterSheet>
      </div>
    </>
  )
}

export default OrdersFilters

// `sort` is excluded on purpose: it is always set to something, so counting it would leave the
// toggle permanently badged "1" and say nothing about how narrow the listing is.
export const activeCount = (values: OrdersFilterValues, showBranch: boolean): number =>
  (showBranch && values.branchId ? 1 : 0) +
  (values.clientId ? 1 : 0) +
  (values.createdFrom ? 1 : 0) +
  (values.createdTo ? 1 : 0) +
  values.status.length +
  (values.isPriority ? 1 : 0) +
  (values.activity ? 1 : 0) +
  (values.activityStatus ? 1 : 0)

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
  if (values.isPriority) {
    chips.push({
      key: 'isPriority',
      label: values.isPriority === 'true' ? 'Solo prioritarias' : 'Solo normales',
      onRemove: () => onChange('isPriority', ''),
    })
  }
  if (values.activity) {
    chips.push({
      key: 'activity',
      label: `Trabajo: ${OPTION_LABEL(ACTIVITY_OPTIONS, values.activity)}`,
      onRemove: () => onChange('activity', ''),
    })
  }
  if (values.activityStatus) {
    chips.push({
      key: 'activityStatus',
      label: `Etapa: ${OPTION_LABEL(ACTIVITY_STATUS_OPTIONS, values.activityStatus)}`,
      onRemove: () => onChange('activityStatus', ''),
    })
  }
  return chips
}
