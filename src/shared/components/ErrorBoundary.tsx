import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CButton } from '@coreui/react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Catches render-time crashes in the routed content so a single throwing component
// shows a recoverable fallback instead of blanking the whole app. Mounted with a
// per-route key in AppContent, so navigating away clears the error automatically.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, info)
    }
  }

  handleReset = () => this.setState({ hasError: false })

  override render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-5">
          <h4 className="mb-3">Algo salió mal</h4>
          <p className="text-body-secondary mb-3">
            Ocurrió un error inesperado al mostrar esta sección.
          </p>
          <CButton color="primary" onClick={this.handleReset}>
            Reintentar
          </CButton>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
