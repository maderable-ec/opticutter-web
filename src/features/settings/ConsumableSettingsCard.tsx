import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { CCol, CFormInput, CFormLabel, CInputGroup, CInputGroupText, CRow } from '@coreui/react'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { useConsumableSettings, useUpdateConsumableSettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { ConsumableSettings } from './types'
import SettingsSection from './SettingsSection'

const KEY = 'glueLoadKg'
// The API's ceiling: nobody loads a pot with more.
const MAX_KG = 50

// One field today: the standard load of the glue pot. It is only where the bander's control
// starts — each load keeps the kilos it actually took — so retuning it is safe at any time.
const ConsumableSettingsCard = () => {
  const { data, isLoading, isError, refetch } = useConsumableSettings()
  const update = useUpdateConsumableSettings()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [input, setInput] = useState<string | null>(null)
  const [clientError, setClientError] = useState('')

  // Sync to server truth on load and after each PATCH, like the other settings cards.
  const [seenData, setSeenData] = useState<ConsumableSettings | null>(null)
  if (data && data !== seenData) {
    setSeenData(data)
    setInput(String(data.glueLoadKg))
  }

  const isDirty = !!data && input !== null && Number(input) !== data.glueLoadKg

  const handleSave = () => {
    if (!data || input === null) return
    const value = Number(input)
    if (input.trim() === '' || !Number.isFinite(value)) {
      setClientError('Ingresa un número válido.')
    } else if (value <= 0) {
      setClientError('Tiene que ser mayor que cero.')
    } else if (value > MAX_KG) {
      setClientError(`No puede pasar de ${MAX_KG} kg.`)
    } else {
      setClientError('')
      update.mutate({ glueLoadKg: value }, { onSuccess: () => flashSaved() })
    }
  }

  const handleDiscard = () => {
    if (data) setInput(String(data.glueLoadKg))
    setClientError('')
    update.reset()
  }

  const serverErrors = fieldErrorsFromApiError(update.error)
  const fieldErrors = { ...serverErrors, ...(clientError ? { [KEY]: clientError } : {}) }
  const genericError = hasGenericError(update.error, serverErrors)

  return (
    <SettingsSection
      title="Insumos del taller"
      description={
        <>
          La <strong>carga estándar de goma</strong> es la cantidad con la que el canteador
          encuentra el control al registrar una carga; puede ajustarla si esa vez fue distinta. Cada
          carga guarda los kilos que realmente llevó, así que cambiar este valor no altera las ya
          registradas.
        </>
      }
      ready={!isLoading && input !== null}
      isError={isError}
      onRetry={() => void refetch()}
      dirty={isDirty}
      saving={update.isPending}
      saved={savedFlash}
      savedMessage="Carga estándar de goma guardada correctamente."
      error={genericError ? update.error?.message || 'Error al guardar. Intenta nuevamente.' : null}
      onSave={handleSave}
      onDiscard={handleDiscard}
    >
      {input !== null && (
        <CRow className="g-3">
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="consumables-glue-load">Carga estándar de goma</CFormLabel>
            <CInputGroup>
              <CFormInput
                id="consumables-glue-load"
                type="number"
                min={0.5}
                max={MAX_KG}
                step={0.5}
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setInput(e.target.value)
                  setClientError('')
                }}
                invalid={!!fieldErrors[KEY]}
              />
              <CInputGroupText>kg</CInputGroupText>
            </CInputGroup>
            <FieldError name={KEY} errors={fieldErrors} />
            <div className="form-text">Kilos que lleva la olla de la canteadora en cada carga.</div>
          </CCol>
        </CRow>
      )}
    </SettingsSection>
  )
}

export default ConsumableSettingsCard
