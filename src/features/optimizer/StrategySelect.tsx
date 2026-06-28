import { CFormSelect, CFormText } from '@coreui/react'
import type { PackingStrategy } from './types'

interface StrategySelectProps {
  value: PackingStrategy
  onChange: (s: PackingStrategy) => void
  disabled?: boolean
}

const OPTIONS: { value: PackingStrategy; label: string }[] = [
  { value: 'default', label: 'Máxima eficiencia' },
  { value: 'longOffcuts', label: 'Retazos largos' },
]

const StrategySelect = ({ value, onChange, disabled }: StrategySelectProps) => (
  <>
    <CFormSelect
      value={value}
      onChange={(e) => onChange(e.target.value as PackingStrategy)}
      disabled={disabled}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </CFormSelect>
    <CFormText>Retazos largos: agrupa el sobrante en una tira larga reutilizable.</CFormText>
  </>
)

export default StrategySelect
