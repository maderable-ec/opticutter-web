import { Link } from 'react-router-dom'
import Icon from 'src/shared/icons/Icon'
import { CButton } from '@coreui/react'

import { useDocumentTitle } from 'src/shared/hooks/useDocumentTitle'

// Something failed on our side. Retrying is the first thing to try, the start page the second.
const Page500 = () => {
  useDocumentTitle('Error · Maderable')
  return (
    <div className="error-page">
      <div className="empty-state">
        <span className="empty-state__icon empty-state__icon--danger" aria-hidden="true">
          <Icon name="error" />
        </span>
        <h1 className="error-page__code">500</h1>
        <p className="empty-state__title">Algo falló de nuestro lado.</p>
        <p className="empty-state__hint">Vuelve a intentarlo en un momento.</p>
        <div className="empty-state__action">
          <CButton color="primary" onClick={() => window.location.reload()}>
            Reintentar
          </CButton>
          <Link to="/" className="btn btn-outline-secondary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page500
