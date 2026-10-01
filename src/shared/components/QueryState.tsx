import type { ReactNode } from 'react'
import Icon from 'src/shared/icons/Icon'
import { CButton } from '@coreui/react'

import LoadingBlock from './LoadingBlock'

interface ErrorStateProps {
  title?: string
  // What went wrong in the user's words, when the caller knows (a 404 is not a network error).
  hint?: ReactNode
  onRetry?: () => void
  // An extra way out beside «Reintentar»: back to the list, for instance.
  action?: ReactNode
}

// A request that failed, said the same way on every screen: what happened, and a way to try again.
// It replaced five variants — grey text with a link, a bare red alert with no retry, the raw
// `error.message` in small red type…
export const ErrorState = ({
  title = 'No se pudieron cargar los datos.',
  hint = 'Revisa la conexión e inténtalo otra vez.',
  onRetry,
  action,
}: ErrorStateProps) => (
  <div className="empty-state" role="alert">
    <span className="empty-state__icon empty-state__icon--danger" aria-hidden="true">
      <Icon name="error" />
    </span>
    <p className="empty-state__title">{title}</p>
    {hint && <p className="empty-state__hint">{hint}</p>}
    {(onRetry || action) && (
      <div className="empty-state__action">
        {onRetry && (
          <CButton color="secondary" variant="outline" onClick={onRetry}>
            Reintentar
          </CButton>
        )}
        {action}
      </div>
    )}
  </div>
)

interface QueryStateProps {
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  // The skeleton's shape while loading.
  loading?: 'list' | 'cards' | 'detail'
  children: ReactNode
}

// Wraps async content with the unified loading and error states, so a page never silently renders
// an empty table when a fetch fails.
const QueryState = ({
  isLoading,
  isError,
  onRetry,
  loading = 'list',
  children,
}: QueryStateProps) => {
  if (isLoading) return <LoadingBlock variant={loading} />
  if (isError) return <ErrorState onRetry={onRetry} />
  return <>{children}</>
}

export default QueryState
