import { CFormSelect } from '@coreui/react'
import { usePriceTiers } from './usePriceTiers'

interface PriceTierSelectProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  invalid?: boolean
}

const PriceTierSelect = ({ value, onChange, disabled, invalid }: PriceTierSelectProps) => {
  const { data: tiers = [], isLoading } = usePriceTiers()

  return (
    <CFormSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || isLoading}
      invalid={invalid}
    >
      {tiers.map((t) => (
        <option key={t.code} value={t.code}>
          {t.name}
        </option>
      ))}
    </CFormSelect>
  )
}

export default PriceTierSelect
