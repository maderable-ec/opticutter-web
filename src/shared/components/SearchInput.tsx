import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CFormInput, CInputGroup, CInputGroupText } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'
import { useDebounce } from 'src/shared/hooks/useDebounce'
import { SEARCH_DEBOUNCE_MS } from 'src/shared/constants'

interface SearchInputProps {
  // Called with the debounced value whenever the query settles.
  onChange: (value: string) => void
  placeholder?: string
  delayMs?: number
  className?: string
  style?: CSSProperties
}

// Self-contained search box: an input + magnifier icon that debounces keystrokes
// (via useDebounce) before notifying the parent, so list pages don't reimplement it.
const SearchInput = ({
  onChange,
  placeholder,
  delayMs = SEARCH_DEBOUNCE_MS,
  className,
  style,
}: SearchInputProps) => {
  const [value, setValue] = useState('')
  const debounced = useDebounce(value, delayMs)

  // Keep the latest onChange in a ref so the debounce effect below depends only on the
  // settled value, not on onChange's identity (which changes on every parent render).
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })
  const isFirst = useRef(true)

  useEffect(() => {
    // Skip the initial empty value — parents already start from an empty query.
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    onChangeRef.current(debounced)
  }, [debounced])

  return (
    <CInputGroup className={className} style={style}>
      <CInputGroupText>
        <CIcon icon={cilSearch} />
      </CInputGroupText>
      <CFormInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </CInputGroup>
  )
}

export default SearchInput
