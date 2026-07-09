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
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckAlt, cilSave } from '@coreui/icons'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { usePreorderSettings, useUpdatePreorderSettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { PreorderPayload, PreorderSettings } from './types'

// Each key matches the API field name (and server error field). All are positive integers.
const FIELDS = [
  ['preorderValidityDays', 'Validez de la pre-orden (días)'],
  ['maxOpenPreordersPerClient', 'Tope de pre-órdenes abiertas por cliente'],
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
    <CCard className="mb-4">
      <CCardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <strong>Pre-órdenes</strong>
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
              Controlan cuánto tiempo es válida una pre-orden y cuántas puede tener abiertas cada
              cliente. La validez se imprime en la proforma de la pre-orden.
            </p>

            {savedFlash && (
              <CAlert color="success" className="py-2">
                Configuración de pre-órdenes guardada correctamente.
              </CAlert>
            )}
            {genericError && (
              <CAlert color="danger" className="py-2">
                {update.error?.message || 'Error al guardar. Intenta nuevamente.'}
              </CAlert>
            )}

            <CRow className="g-3">
              {FIELDS.map(([key, label]) => (
                <CCol xs={12} md={6} key={key}>
                  <CFormLabel>{label}</CFormLabel>
                  <CFormInput
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
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PreorderSettingsCard
