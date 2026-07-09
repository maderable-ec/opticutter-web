import type { ReactNode } from 'react'
import { CButton, CSpinner } from '@coreui/react'

interface QueryStateProps {
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  children: ReactNode
}

// Wraps async content with unified loading/error states: a spinner while loading and a
// "No se pudieron cargar los datos." message with a retry action on failure — so list
// pages stop silently rendering an empty table when a fetch fails.
const QueryState = ({ isLoading, isError, onRetry, children }: QueryStateProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-5 text-body-secondary">
        No se pudieron cargar los datos.{' '}
        {onRetry && (
          <CButton size="sm" color="link" onClick={onRetry}>
            Reintentar
          </CButton>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export default QueryState
