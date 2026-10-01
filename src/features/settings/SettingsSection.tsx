import type { ReactNode } from 'react'
import { CAlert, CButton } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import Spinner from 'src/shared/components/Spinner'
import Section from 'src/shared/components/Section'

interface SettingsSectionProps {
  title: string
  // What changing these values does, above the fields.
  description: ReactNode
  // False until the form holds the server's values.
  ready: boolean
  isError: boolean
  onRetry: () => void
  dirty: boolean
  saving: boolean
  // For two seconds after a save: «Guardado» on the button and `savedMessage` above the fields.
  saved: boolean
  savedMessage: string
  // A save error that belongs to no field (the field ones hang from their input).
  error?: string | null
  onSave: () => void
  onDiscard: () => void
  children: ReactNode
}

// One block of Configuración, on the shared `Section`, where each used to be a CCard with a grey
// header bar. Each block loads and saves its own section
// of the settings (its own GET and PATCH), so each keeps its own Descartar/Guardar, at the foot,
// after the fields they save: in the header, a phone had no room for them beside the title and
// they wrapped above the fields.
const SettingsSection = ({
  title,
  description,
  ready,
  isError,
  onRetry,
  dirty,
  saving,
  saved,
  savedMessage,
  error,
  onSave,
  onDiscard,
  children,
}: SettingsSectionProps) => {
  return (
    <Section title={title} className="mb-3">
      {!ready ? (
        isError ? (
          <ErrorState onRetry={onRetry} />
        ) : (
          <LoadingBlock rows={3} />
        )
      ) : (
        <>
          <p className="text-body-secondary small mb-3">{description}</p>
          {saved && (
            <CAlert color="success" className="py-2">
              {savedMessage}
            </CAlert>
          )}
          {error && (
            <CAlert color="danger" className="py-2">
              {error}
            </CAlert>
          )}
          {children}
          <div className="d-flex justify-content-end gap-2 mt-3">
            <CButton
              color="secondary"
              variant="outline"
              type="button"
              disabled={!dirty || saving}
              onClick={onDiscard}
            >
              Descartar
            </CButton>
            <CButton color="primary" type="button" disabled={!dirty || saving} onClick={onSave}>
              {saving ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <Icon name={saved ? 'check' : 'save'} className="me-1" />
              )}
              {saved ? 'Guardado' : 'Guardar'}
            </CButton>
          </div>
        </>
      )}
    </Section>
  )
}

export default SettingsSection
