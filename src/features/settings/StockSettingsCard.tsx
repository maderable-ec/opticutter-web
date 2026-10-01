import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { CCol, CFormInput, CFormLabel, CInputGroup, CInputGroupText, CRow } from '@coreui/react'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { useStockSettings, useUpdateStockSettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { StockSettings } from './types'
import SettingsSection from './SettingsSection'

// Two fields and not one, because the units are not the same: a board is
// counted in whole sheets and a tapacanto in linear metres. The unit rides
// beside each input for exactly that reason — "5" means nothing on its own.
const FIELDS = [
  {
    key: 'board' as const,
    label: 'Tableros',
    unit: 'láminas',
    hint: 'Láminas que debe tener la bodega de la sucursal.',
  },
  {
    key: 'edgeBanding' as const,
    label: 'Tapacantos',
    unit: 'm',
    hint: 'Metros lineales que debe tener la bodega de la sucursal.',
  },
]

type StockField = (typeof FIELDS)[number]['key']

const toInputs = (data: StockSettings): Record<StockField, string> => ({
  board: String(data.board),
  edgeBanding: String(data.edgeBanding),
})

const StockSettingsCard = () => {
  const { data, isLoading, isError, refetch } = useStockSettings()
  const update = useUpdateStockSettings()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [inputs, setInputs] = useState<Record<StockField, string> | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  // Sync to server truth on load and after each PATCH — the same "adjust state
  // during render" the other settings cards use.
  const [seenData, setSeenData] = useState<StockSettings | null>(null)
  if (data && data !== seenData) {
    setSeenData(data)
    setInputs(toInputs(data))
  }

  const isDirty = !!data && !!inputs && FIELDS.some(({ key }) => Number(inputs[key]) !== data[key])

  const handleSave = () => {
    if (!data || !inputs) return
    const errors: Record<string, string> = {}
    const payload: Partial<StockSettings> = {}
    FIELDS.forEach(({ key }) => {
      const value = Number(inputs[key])
      if (inputs[key].trim() === '' || !Number.isFinite(value)) {
        errors[key] = 'Ingresa un número válido.'
      } else if (value < 0) {
        errors[key] = 'No puede ser negativo.'
      } else if (value !== data[key]) {
        payload[key] = value
      }
    })
    setClientErrors(errors)
    if (Object.keys(errors).length > 0) return
    update.mutate(payload, { onSuccess: () => flashSaved() })
  }

  const handleDiscard = () => {
    if (data) setInputs(toInputs(data))
    setClientErrors({})
    update.reset()
  }

  const serverErrors = fieldErrorsFromApiError(update.error)
  const fieldErrors = { ...serverErrors, ...clientErrors }
  const genericError = hasGenericError(update.error, serverErrors)

  return (
    <SettingsSection
      title="Stock mínimo"
      description={
        <>
          Debajo de estos mínimos un producto se considera <strong>con stock bajo</strong>: se avisa
          al cotizar y aparece en el reporte de stock bajo. El stock se consulta por sucursal en el
          sistema de inventario, así que una sucursal sin bodega configurada no genera alertas.
        </>
      }
      ready={!isLoading && inputs !== null}
      isError={isError}
      onRetry={() => void refetch()}
      dirty={isDirty}
      saving={update.isPending}
      saved={savedFlash}
      savedMessage="Configuración de stock guardada correctamente."
      error={genericError ? update.error?.message || 'Error al guardar. Intenta nuevamente.' : null}
      onSave={handleSave}
      onDiscard={handleDiscard}
    >
      {inputs && (
        <CRow className="g-3">
          {FIELDS.map(({ key, label, unit, hint }) => (
            <CCol xs={12} md={4} key={key}>
              <CFormLabel htmlFor={`stock-${key}`}>{label}</CFormLabel>
              <CInputGroup>
                <CFormInput
                  id={`stock-${key}`}
                  type="number"
                  min={0}
                  step="any"
                  value={inputs[key]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setInputs({ ...inputs, [key]: e.target.value })
                    setClientErrors({ ...clientErrors, [key]: '' })
                  }}
                  invalid={!!fieldErrors[key]}
                />
                <CInputGroupText>{unit}</CInputGroupText>
              </CInputGroup>
              <FieldError name={key} errors={fieldErrors} />
              <div className="form-text">{hint}</div>
            </CCol>
          ))}
        </CRow>
      )}
    </SettingsSection>
  )
}

export default StockSettingsCard
