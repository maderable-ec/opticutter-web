import { useState } from 'react'
import { CButton, CFormInput } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import { fmtNumber } from 'src/shared/utils/format'
import { useUpdateWorkSchedule, useWorkSchedule } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import SettingsSection from './SettingsSection'
import {
  DAYS,
  MAX_WINDOWS,
  nextWindow,
  sameSchedule,
  scheduleErrors,
  weeklyHours,
  type DayKey,
  type TimeWindow,
  type WorkSchedule,
} from './workSchedule'

// The shop's working hours: seven rows, each with its stretches or «No laborable». It is what the
// statistics read the cut's and the banding's time against — an order left open across the night,
// the lunch hour or a closed day did not keep anybody working — so it is one schedule for every
// branch, and editing it re-reads the past periods too. The form says that last part out loud:
// it is the one setting here that changes numbers already looked at.
const WorkScheduleSettingsCard = () => {
  const { data, isLoading, isError, refetch } = useWorkSchedule()
  const update = useUpdateWorkSchedule()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [form, setForm] = useState<WorkSchedule | null>(null)
  // Sync to server truth on load and after each PATCH ("adjust state during render", the pattern
  // the other settings cards use).
  const [seenData, setSeenData] = useState<WorkSchedule | null>(null)
  if (data && data !== seenData) {
    setSeenData(data)
    setForm(data)
  }

  const errors = form ? scheduleErrors(form) : {}
  const valid = Object.keys(errors).length === 0
  const isDirty = !!data && !!form && !sameSchedule(form, data)

  const setDay = (key: DayKey, windows: TimeWindow[]) =>
    setForm((prev) => (prev ? { ...prev, [key]: windows } : prev))

  const setWindow = (key: DayKey, index: number, field: keyof TimeWindow, value: string) => {
    if (!form) return
    setDay(
      key,
      form[key].map((window, i) => (i === index ? { ...window, [field]: value } : window)),
    )
  }

  const handleSave = () => {
    if (!form || !valid) return
    update.mutate(form, { onSuccess: () => flashSaved() })
  }

  const handleDiscard = () => {
    if (data) setForm(data)
    update.reset()
  }

  return (
    <SettingsSection
      title="Horario laboral"
      description={
        <>
          Las horas en que el taller trabaja, iguales para todas las sucursales. Las estadísticas
          leen contra este horario el tiempo de corte y de canteado: lo que una orden pasó abierta
          de noche, en el almuerzo o en un día no laborable no cuenta como trabajo.{' '}
          <strong>Cambiarlo recalcula también los períodos anteriores.</strong>
        </>
      }
      ready={!isLoading && form !== null}
      isError={isError}
      onRetry={() => void refetch()}
      dirty={isDirty && valid}
      saving={update.isPending}
      saved={savedFlash}
      savedMessage="Horario laboral guardado correctamente."
      error={update.error ? update.error.message || 'Error al guardar. Intenta nuevamente.' : null}
      onSave={handleSave}
      onDiscard={handleDiscard}
    >
      {form && (
        <>
          <ul className="work-schedule">
            {DAYS.map(({ key, label }) => {
              const windows = form[key]
              return (
                <li key={key} className="work-schedule__day">
                  <span className="work-schedule__name">{label}</span>
                  <div className="work-schedule__windows">
                    {windows.length === 0 && (
                      <span className="text-body-secondary">No laborable</span>
                    )}
                    {windows.map((window, index) => (
                      // The index is the window's identity: a day's stretches have no other.
                      <div key={index} className="work-schedule__window">
                        <CFormInput
                          type="time"
                          size="sm"
                          aria-label={`${label}, franja ${index + 1}: desde`}
                          value={window.start}
                          invalid={!!errors[key]}
                          onChange={(e) => setWindow(key, index, 'start', e.target.value)}
                        />
                        <span className="text-body-secondary">a</span>
                        <CFormInput
                          type="time"
                          size="sm"
                          aria-label={`${label}, franja ${index + 1}: hasta`}
                          value={window.end}
                          invalid={!!errors[key]}
                          onChange={(e) => setWindow(key, index, 'end', e.target.value)}
                        />
                        <CButton
                          color="secondary"
                          variant="ghost"
                          size="sm"
                          aria-label={`Quitar la franja ${index + 1} del ${label.toLowerCase()}`}
                          title="Quitar franja"
                          onClick={() =>
                            setDay(
                              key,
                              windows.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Icon name="delete" />
                        </CButton>
                      </div>
                    ))}
                    {windows.length < MAX_WINDOWS && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => setDay(key, [...windows, nextWindow(windows)])}
                      >
                        Agregar franja
                      </button>
                    )}
                    {errors[key] && <div className="text-danger small w-100">{errors[key]}</div>}
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="text-body-secondary small mt-3 mb-0">
            {fmtNumber(weeklyHours(form), 1, 0)} h laborables a la semana.
          </p>
        </>
      )}
    </SettingsSection>
  )
}

export default WorkScheduleSettingsCard
