import { useId, useState } from 'react'
import Icon from 'src/shared/icons/Icon'
import { CBadge, CButton, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'

import BottomSheet from 'src/shared/components/BottomSheet'
import { useActiveBranches } from 'src/features/branches/useBranches'
import type { Role } from 'src/features/auth/types'
import { localDateKey } from 'src/shared/utils/date'
import {
  GRANULARITIES,
  PERIOD_PRESETS,
  ROLE_OPTIONS,
  activeFilterCount,
  periodSummary,
} from '../reportFilters'
import type { ReportFiltersState } from '../useReportFilters'
import Segmented from './Segmented'

interface ReportFiltersProps {
  filters: ReportFiltersState
  // Only the reports with a time axis group it («Agrupar por»).
  granularity?: boolean
  // Only the people reports filter by role.
  role?: boolean
  // Off where the report compares every branch side by side (Resumen): a filter would hide a column.
  branch?: boolean
}

type FieldsProps = ReportFiltersProps & { branches: { id: number; name: string }[] }

// The fields past the presets: the range by hand, the branch, and what the report adds. The same
// set on both widths, laid on one row from `md` and stacked in the phone's sheet.
const Fields = ({
  filters,
  branches,
  granularity = false,
  role = false,
  branch = true,
}: FieldsProps) => {
  const id = useId()
  return (
    <>
      <div className="report-filters__field">
        <CFormLabel htmlFor={`${id}-from`}>Desde</CFormLabel>
        <CFormInput
          id={`${id}-from`}
          type="date"
          value={filters.from}
          max={localDateKey()}
          onChange={(e) => filters.setRangeEnd('from', e.target.value)}
        />
      </div>
      <div className="report-filters__field">
        <CFormLabel htmlFor={`${id}-to`}>Hasta</CFormLabel>
        <CFormInput
          id={`${id}-to`}
          type="date"
          value={filters.to}
          max={localDateKey()}
          onChange={(e) => filters.setRangeEnd('to', e.target.value)}
        />
      </div>
      {branch && (
        <div className="report-filters__field">
          <CFormLabel htmlFor={`${id}-branch`}>Sucursal</CFormLabel>
          <CFormSelect
            id={`${id}-branch`}
            value={filters.branchId ?? ''}
            onChange={(e) =>
              filters.setBranchId(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </CFormSelect>
        </div>
      )}
      {role && (
        <div className="report-filters__field">
          <CFormLabel htmlFor={`${id}-role`}>Rol</CFormLabel>
          <CFormSelect
            id={`${id}-role`}
            value={filters.role ?? ''}
            onChange={(e) => filters.setRole((e.target.value || undefined) as Role | undefined)}
          >
            <option value="">Todos</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </CFormSelect>
        </div>
      )}
      {granularity && (
        <div className="report-filters__field">
          <span className="form-label" id={`${id}-granularity`}>
            Agrupar por
          </span>
          <Segmented
            label="Agrupar por"
            items={GRANULARITIES}
            value={filters.granularity}
            onChange={filters.setGranularity}
          />
        </div>
      )}
    </>
  )
}

/**
 * The window a report looks through, in ONE row above everything it scopes: every figure and chart
 * below re-reads the same slice, so they always agree.
 *
 * On a phone the old block of five labelled fields took the whole first screen before a single
 * figure. There the presets stay in view — the choice made nine times in ten — and the rest waits
 * behind «Filtros» in a sheet, with one line saying what the report is showing. The sheet applies as
 * it goes: the report stays in sight above it, so each change can be watched landing.
 */
const ReportFilters = (props: ReportFiltersProps) => {
  const { filters } = props
  const { data: branches = [] } = useActiveBranches()
  const [sheetOpen, setSheetOpen] = useState(false)
  const branchName = branches.find((b) => b.id === filters.branchId)?.name
  const activeCount = activeFilterCount(filters, props)

  const presets = (
    <Segmented
      label="Período"
      items={PERIOD_PRESETS}
      value={filters.preset}
      onChange={filters.setPreset}
    />
  )

  return (
    <div className="surface report-filters">
      <div className="report-filters__row d-none d-md-flex">
        <div className="report-filters__field">
          <span className="form-label">Período</span>
          {presets}
        </div>
        <Fields {...props} branches={branches} />
      </div>

      <div className="d-md-none">
        {presets}
        <div className="report-filters__summary">
          <span className="report-filters__scope">
            {periodSummary(filters)}
            {props.branch !== false && ` · ${branchName ?? 'Todas las sucursales'}`}
          </span>
          <CButton
            color="secondary"
            variant="outline"
            className="d-flex align-items-center gap-2"
            onClick={() => setSheetOpen(true)}
          >
            <Icon name="filter" />
            Filtros
            {activeCount > 0 && (
              <CBadge color="primary" shape="rounded-pill">
                {activeCount}
              </CBadge>
            )}
          </CButton>
        </div>
        <BottomSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filtros"
          subtitle={periodSummary(filters)}
          className="report-filters__sheet"
          footer={
            <>
              <CButton color="link" onClick={filters.reset}>
                Restablecer
              </CButton>
              <CButton color="primary" className="flex-grow-1" onClick={() => setSheetOpen(false)}>
                Listo
              </CButton>
            </>
          }
        >
          <div className="report-filters__stack">
            <Fields {...props} branches={branches} />
          </div>
        </BottomSheet>
      </div>
    </div>
  )
}

export default ReportFilters
