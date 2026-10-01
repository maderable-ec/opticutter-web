import { Link } from 'react-router-dom'
import Icon from 'src/shared/icons/Icon'

import { useDocumentTitle } from 'src/shared/hooks/useDocumentTitle'

// A link that leads nowhere: say so, and give the one way out that always works.
const Page404 = () => {
  useDocumentTitle('Página no encontrada · Maderable')
  return (
    <div className="error-page">
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          <Icon name="notFound" />
        </span>
        <h1 className="error-page__code">404</h1>
        <p className="empty-state__title">No encontramos esta página.</p>
        <p className="empty-state__hint">
          Puede que el enlace esté mal escrito o que ya no exista.
        </p>
        <div className="empty-state__action">
          <Link to="/" className="btn btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page404
