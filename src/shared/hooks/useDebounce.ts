import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from 'src/shared/constants'

// Returns `value` after it has stopped changing for `ms` milliseconds. Useful for
// debouncing search inputs before they trigger an API request.
export const useDebounce = <T>(value: T, ms: number = SEARCH_DEBOUNCE_MS): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])

  return debounced
}
