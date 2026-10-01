import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CCol, CFormInput, CFormLabel, CInputGroup, CInputGroupText, CRow } from '@coreui/react'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { useCuttingSettings, useUpdateCuttingSettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { CuttingPayload, CuttingSettings } from './types'
import SettingsSection from './SettingsSection'

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
  const idPrefix = useId()

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

  const fieldId = (key: FormKey) => `${idPrefix}-${key}`

  return (
    <SettingsSection
      title="Parámetros de corte"
      description="Cambiar estos parámetros afecta futuras optimizaciones y cotizaciones. Las órdenes ya confirmadas conservan su precio."
      ready={!isLoading && !!form}
      isError={isError}
      onRetry={() => void refetch()}
      dirty={isDirty}
      saving={update.isPending}
      saved={savedFlash}
      savedMessage="Parámetros de corte guardados correctamente."
      error={genericError ? update.error?.message || 'Error al guardar. Intenta nuevamente.' : null}
      onSave={handleSave}
      onDiscard={handleDiscard}
    >
      {form && (
        <CRow className="g-3">
          {MM_FIELDS.map(([key, label]) => (
            <CCol xs={6} md={4} key={key}>
              <CFormLabel htmlFor={fieldId(key)}>{label}</CFormLabel>
              <CInputGroup>
                <CFormInput
                  id={fieldId(key)}
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
            <CFormLabel htmlFor={fieldId('edgeBandingWasteFactor')}>Merma de tapacanto</CFormLabel>
            <CInputGroup>
              <CFormInput
                id={fieldId('edgeBandingWasteFactor')}
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
            <CFormLabel htmlFor={fieldId('halfBoardMarkupPct')}>Recargo medio tablero</CFormLabel>
            <CInputGroup>
              <CFormInput
                id={fieldId('halfBoardMarkupPct')}
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
      )}
    </SettingsSection>
  )
}

export default CuttingSettingsCard
