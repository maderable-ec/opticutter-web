import { useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckAlt, cilSave } from '@coreui/icons'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { useCuttingSettings, useUpdateCuttingSettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { CuttingPayload, CuttingSettings } from './types'

// Distance fields shown in mm. The key matches the API field name (and server error field).
const MM_FIELDS = [
  ['kerf', 'Kerf (ancho de sierra)'],
  ['topTrim', 'Recorte superior'],
  ['bottomTrim', 'Recorte inferior'],
  ['leftTrim', 'Recorte izquierdo'],
  ['rightTrim', 'Recorte derecho'],
] as const

type FormKey = (typeof MM_FIELDS)[number][0] | 'edgeBandingWasteFactor' | 'halfBoardMarkupPct'
type FormState = Record<FormKey, string>

// Round to drop floating-point noise from the percent<->fraction conversion.
const clean = (n: number) => Math.round(n * 1e6) / 1e6
const fractionToPercent = (f: number) => clean(f * 100)
const percentToFraction = (p: number) => clean(p / 100)

// `edgeBandingWasteFactor` is stored in the form as a PERCENTAGE string (10 = 10%).
const toForm = (s: CuttingSettings): FormState => ({
  kerf: String(s.kerf),
  topTrim: String(s.topTrim),
  bottomTrim: String(s.bottomTrim),
  leftTrim: String(s.leftTrim),
  rightTrim: String(s.rightTrim),
  edgeBandingWasteFactor: String(fractionToPercent(s.edgeBandingWasteFactor)),
  halfBoardMarkupPct: String(fractionToPercent(s.halfBoardMarkupPct)),
})

const parseNum = (raw: string): number | null => {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Server value for a given form key (waste is converted percent -> fraction). */
const formValueAsApi = (key: FormKey, num: number) =>
  key === 'edgeBandingWasteFactor' || key === 'halfBoardMarkupPct' ? percentToFraction(num) : num

const CuttingSettingsCard = () => {
  const { data, isLoading, isError, refetch } = useCuttingSettings()
  const update = useUpdateCuttingSettings()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [form, setForm] = useState<FormState | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  // Sync the form to server truth on initial load and after each successful PATCH,
  // using the "adjust state during render" pattern (avoids a setState-in-effect).
  const [seenData, setSeenData] = useState<CuttingSettings | null>(null)
  if (data && data !== seenData) {
    setSeenData(data)
    setForm(toForm(data))
  }

  const onChange = (key: FormKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setClientErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const allKeys: FormKey[] = [
    ...MM_FIELDS.map(([k]) => k),
    'edgeBandingWasteFactor',
    'halfBoardMarkupPct',
  ]

  // A field is dirty when its parsed value differs from the loaded server value.
  const isDirty =
    !!form &&
    !!data &&
    allKeys.some((key) => {
      const num = parseNum(form[key])
      if (num === null) return true
      return formValueAsApi(key, num) !== data[key]
    })

  const validate = (f: FormState): Record<string, string> => {
    const errors: Record<string, string> = {}
    for (const key of allKeys) {
      const num = parseNum(f[key])
      if (num === null) errors[key] = 'Ingresa un número válido.'
      else if (num < 0) errors[key] = 'No puede ser negativo.'
    }
    return errors
  }

  const handleSave = () => {
    if (!form || !data) return
    const errors = validate(form)
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors)
      return
    }
    // Send only the fields that changed vs the loaded values.
    const payload: CuttingPayload = {}
    for (const key of allKeys) {
      const value = formValueAsApi(key, parseNum(form[key]) as number)
      if (value !== data[key]) payload[key] = value
    }
    if (Object.keys(payload).length === 0) return
    setClientErrors({})
    update.mutate(payload, { onSuccess: () => flashSaved() })
  }

  const handleDiscard = () => {
    if (data) setForm(toForm(data))
    setClientErrors({})
    update.reset()
  }

  const serverErrors = fieldErrorsFromApiError(update.error)
  const fieldErrors = { ...serverErrors, ...clientErrors }
  const genericError = hasGenericError(update.error, serverErrors)

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <strong>Parámetros de corte</strong>
        <div className="d-flex gap-2">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            type="button"
            disabled={!isDirty || update.isPending}
            onClick={handleDiscard}
          >
            Descartar
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="button"
            disabled={!isDirty || update.isPending}
            onClick={handleSave}
          >
            {update.isPending ? (
              <CSpinner size="sm" className="me-1" />
            ) : (
              <CIcon icon={savedFlash ? cilCheckAlt : cilSave} className="me-1" />
            )}
            {savedFlash ? 'Guardado' : 'Guardar'}
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {isLoading || !form ? (
          <div className="text-center py-5">
            {isError ? (
              <div className="text-body-secondary">
                No se pudieron cargar los parámetros.{' '}
                <CButton size="sm" color="link" onClick={() => void refetch()}>
                  Reintentar
                </CButton>
              </div>
            ) : (
              <CSpinner color="primary" />
            )}
          </div>
        ) : (
          <>
            <p className="text-body-secondary small mb-3">
              Cambiar estos parámetros afecta futuras optimizaciones y proformas. Los pedidos ya
              confirmados conservan su precio.
            </p>

            {savedFlash && (
              <CAlert color="success" className="py-2">
                Parámetros de corte guardados correctamente.
              </CAlert>
            )}
            {genericError && (
              <CAlert color="danger" className="py-2">
                {update.error?.message || 'Error al guardar. Intenta nuevamente.'}
              </CAlert>
            )}

            <CRow className="g-3">
              {MM_FIELDS.map(([key, label]) => (
                <CCol xs={6} md={4} key={key}>
                  <CFormLabel>{label}</CFormLabel>
                  <CInputGroup>
                    <CFormInput
                      type="number"
                      min={0}
                      step="any"
                      value={form[key]}
                      onChange={onChange(key)}
                      invalid={!!fieldErrors[key]}
                    />
                    <CInputGroupText>mm</CInputGroupText>
                  </CInputGroup>
                  <FieldError name={key} errors={fieldErrors} />
                </CCol>
              ))}

              <CCol xs={6} md={4}>
                <CFormLabel>Merma de tapacanto</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    min={0}
                    step="any"
                    value={form.edgeBandingWasteFactor}
                    onChange={onChange('edgeBandingWasteFactor')}
                    invalid={!!fieldErrors.edgeBandingWasteFactor}
                  />
                  <CInputGroupText>%</CInputGroupText>
                </CInputGroup>
                <FieldError name="edgeBandingWasteFactor" errors={fieldErrors} />
                <div className="form-text">Ej.: 10 % = +10 % de material.</div>
              </CCol>

              <CCol xs={6} md={4}>
                <CFormLabel>Recargo medio tablero</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    min={0}
                    step="any"
                    value={form.halfBoardMarkupPct}
                    onChange={onChange('halfBoardMarkupPct')}
                    invalid={!!fieldErrors.halfBoardMarkupPct}
                  />
                  <CInputGroupText>%</CInputGroupText>
                </CInputGroup>
                <FieldError name="halfBoardMarkupPct" errors={fieldErrors} />
                <div className="form-text">
                  Ej.: 15 % = el medio tablero cuesta 50 % + 15 % adicional del precio completo.
                </div>
              </CCol>
            </CRow>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default CuttingSettingsCard
