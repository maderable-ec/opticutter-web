import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import type { Granularity } from '../types'

const today = () => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const startOfMonth = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

interface Preset {
  label: string
  from: () => string
  to: () => string
}

const PRESETS: Preset[] = [
  { label: '7d', from: () => daysAgo(7), to: today },
  { label: '30d', from: () => daysAgo(30), to: today },
  { label: '90d', from: () => daysAgo(90), to: today },
  { label: 'Este mes', from: startOfMonth, to: today },
]

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

interface DateRangeFilterProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  // Optional granularity: the button group is only shown when the callback is provided
  // (views without time buckets don't use it).
  granularity?: Granularity
  onGranularityChange?: (value: Granularity) => void
  // Optional branch filter (only the admin dashboard provides it). '' = all branches.
  branches?: { id: number; name: string }[]
  branchId?: string
  onBranchChange?: (value: string) => void
}

const DateRangeFilter = ({
  from,
  to,
  granularity,
  onFromChange,
  onToChange,
  onGranularityChange,
  branches,
  branchId,
  onBranchChange,
}: DateRangeFilterProps) => {
  const invalid = !!(from && to && from > to)

  return (
    <CCard className="mb-4">
      <CCardBody>
        <CRow className="g-3 align-items-end">
          <CCol xs={12} sm={6} md={3} lg={2}>
            <CFormLabel className="small fw-semibold mb-1">Desde</CFormLabel>
            <CFormInput
              type="date"
              value={from}
              max={to}
              onChange={(e) => onFromChange(e.target.value)}
              invalid={invalid}
            />
          </CCol>
          <CCol xs={12} sm={6} md={3} lg={2}>
            <CFormLabel className="small fw-semibold mb-1">Hasta</CFormLabel>
            <CFormInput
              type="date"
              value={to}
              min={from}
              max={today()}
              onChange={(e) => onToChange(e.target.value)}
              invalid={invalid}
            />
          </CCol>
          {onBranchChange && (
            <CCol xs={12} sm={6} md={3} lg={2}>
              <CFormLabel className="small fw-semibold mb-1">Sucursal</CFormLabel>
              <CFormSelect value={branchId ?? ''} onChange={(e) => onBranchChange(e.target.value)}>
                <option value="">Todas</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          )}
          <CCol xs={12} md="auto">
            <CFormLabel className="small fw-semibold mb-1 d-block">Período</CFormLabel>
            <CButtonGroup>
              {PRESETS.map((p) => (
                <CButton
                  key={p.label}
                  size="sm"
                  color="outline-secondary"
                  onClick={() => {
                    onFromChange(p.from())
                    onToChange(p.to())
                  }}
                >
                  {p.label}
                </CButton>
              ))}
            </CButtonGroup>
          </CCol>
          {onGranularityChange && (
            <CCol xs={12} md="auto">
              <CFormLabel className="small fw-semibold mb-1 d-block">Granularidad</CFormLabel>
              <CButtonGroup>
                {GRANULARITIES.map((g) => (
                  <CButton
                    key={g.value}
                    size="sm"
                    color={granularity === g.value ? 'primary' : 'outline-secondary'}
                    onClick={() => onGranularityChange(g.value)}
                  >
                    {g.label}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          )}
        </CRow>
        {invalid && (
          <div className="text-danger small mt-2">
            La fecha de inicio debe ser anterior o igual a la fecha de fin.
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default DateRangeFilter
