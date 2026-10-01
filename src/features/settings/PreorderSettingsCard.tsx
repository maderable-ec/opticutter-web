import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { usePreorderSettings, useUpdatePreorderSettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { PreorderPayload, PreorderSettings } from './types'
import SettingsSection from './SettingsSection'

// Each key matches the API field name (and server error field). All are positive integers.
const FIELDS = [
  ['preorderValidityDays', 'Validez de la cotización (días)'],
  ['maxOpenPreordersPerClient', 'Tope de cotizaciones abiertas por cliente'],
] as const

type FormKey = (typeof FIELDS)[number][0]
type FormState = Record<FormKey, string>

const toForm = (s: PreorderSettings): FormState => ({
  preorderValidityDays: String(s.preorderValidityDays),
  maxOpenPreordersPerClient: String(s.maxOpenPreordersPerClient),
})

const parseNum = (raw: string): number | null => {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const PreorderSettingsCard = () => {
  const { data, isLoading, isError, refetch } = usePreorderSettings()
  const update = useUpdatePreorderSettings()
  const [savedFlash, flashSaved] = useSavedFlash()
  const idPrefix = useId()

  const [form, setForm] = useState<FormState | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  // Sync the form to server truth on initial load and after each successful PATCH,
  // using the "adjust state during render" pattern (avoids a setState-in-effect).
  const [seenData, setSeenData] = useState<PreorderSettings | null>(null)
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

  const allKeys: FormKey[] = FIELDS.map(([k]) => k)

  // A field is dirty when its parsed value differs from the loaded server value.
  const isDirty =
    !!form &&
    !!data &&
    allKeys.some((key) => {
      const num = parseNum(form[key])
      if (num === null) return true
      return num !== data[key]
    })

  const validate = (f: FormState): Record<string, string> => {
    const errors: Record<string, string> = {}
    for (const key of allKeys) {
      const num = parseNum(f[key])
      if (num === null) errors[key] = 'Ingresa un número válido.'
      else if (!Number.isInteger(num)) errors[key] = 'Debe ser un número entero.'
      else if (num < 1) errors[key] = 'Debe ser mayor o igual a 1.'
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
    const payload: PreorderPayload = {}
    for (const key of allKeys) {
      const value = parseNum(form[key]) as number
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
    <SettingsSection
      title="Cotizaciones"
      description="Controlan cuánto tiempo es válida una cotización y cuántas puede tener abiertas cada cliente. Pasado ese plazo, la cotización queda vencida."
      ready={!isLoading && !!form}
      isError={isError}
      onRetry={() => void refetch()}
      dirty={isDirty}
      saving={update.isPending}
      saved={savedFlash}
      savedMessage="Configuración de cotizaciones guardada correctamente."
      error={genericError ? update.error?.message || 'Error al guardar. Intenta nuevamente.' : null}
      onSave={handleSave}
      onDiscard={handleDiscard}
    >
      {form && (
        <CRow className="g-3">
          {FIELDS.map(([key, label]) => (
            <CCol xs={12} md={6} key={key}>
              <CFormLabel htmlFor={`${idPrefix}-${key}`}>{label}</CFormLabel>
              <CFormInput
                id={`${idPrefix}-${key}`}
                type="number"
                min={1}
                step={1}
                value={form[key]}
                onChange={onChange(key)}
                invalid={!!fieldErrors[key]}
              />
              <FieldError name={key} errors={fieldErrors} />
            </CCol>
          ))}
        </CRow>
      )}
    </SettingsSection>
  )
}

export default PreorderSettingsCard
