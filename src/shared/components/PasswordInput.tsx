import { useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { CButton, CFormInput, CInputGroup, CInputGroupText } from '@coreui/react'

import Icon from 'src/shared/icons/Icon'

interface PasswordInputProps {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  id?: string
  placeholder?: string
  autoComplete?: 'current-password' | 'new-password'
  required?: boolean
  minLength?: number
  disabled?: boolean
  invalid?: boolean
  className?: string
  // Leading addon, for the forms that already show one (the login's padlock).
  startIcon?: ReactNode
}

// Password field with a reveal toggle. Always starts hidden — the visibility is
// per-render state and is deliberately never persisted, so a shared screen can't
// leak a password typed in an earlier session.
const PasswordInput = ({
  value,
  onChange,
  id,
  placeholder,
  autoComplete,
  required,
  minLength,
  disabled,
  invalid,
  className,
  startIcon,
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false)
  const fallbackId = useId()
  const inputId = id ?? fallbackId

  return (
    <CInputGroup className={className}>
      {startIcon && <CInputGroupText>{startIcon}</CInputGroupText>}
      <CFormInput
        id={inputId}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        disabled={disabled}
        invalid={invalid}
      />
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        // Out of the tab order: the toggle is a convenience, and stopping between
        // every password field and the submit button is worse than reaching for it.
        tabIndex={-1}
        disabled={disabled}
        aria-controls={inputId}
        aria-pressed={visible}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon name={visible ? 'hidePassword' : 'showPassword'} />
      </CButton>
    </CInputGroup>
  )
}

export default PasswordInput
