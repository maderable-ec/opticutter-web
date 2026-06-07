import React from 'react'
import { CButton, CButtonGroup, CCard, CCardBody, CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'

const today = () => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const startOfMonth = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

const PRESETS = [
  { label: '7d', from: () => daysAgo(7), to: today },
  { label: '30d', from: () => daysAgo(30), to: today },
  { label: '90d', from: () => daysAgo(90), to: today },
  { label: 'Este mes', from: startOfMonth, to: today },
]

const GRANULARITIES = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

const DateRangeFilter = ({ from, to, granularity, onFromChange, onToChange, onGranularityChange }) => {
  const invalid = from && to && from > to

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
        </CRow>
        {invalid && (
          <div className="text-danger small mt-2">La fecha de inicio debe ser anterior o igual a la fecha de fin.</div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default DateRangeFilter
