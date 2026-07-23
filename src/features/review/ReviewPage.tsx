import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CContainer, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { logo } from 'src/assets/brand/logo'
import { ApiError } from 'src/shared/api/types'
import ReferenceNote from 'src/shared/components/ReferenceNote'
import { useReview } from './useReview'
import ReviewSummary from './ReviewSummary'
import ReviewActions from './ReviewActions'
import { fmtDate, fmtDateTime } from './format'

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="min-vh-100 bg-body-tertiary py-4" style={{ borderTop: '4px solid #E85050' }}>
    <CContainer style={{ maxWidth: 880 }}>
      <div className="text-center mb-5">
        <CIcon icon={logo} height={56} />
        <div className="text-body-secondary small mt-2">Revisión de cotización</div>
      </div>
      {children}
    </CContainer>
  </div>
)

const InfoView = ({ title, children }: { title: ReactNode; children?: ReactNode }) => (
  <Shell>
    <CCard>
      <CCardBody className="text-center py-5">
        <h5>{title}</h5>
        {children && <div className="text-body-secondary mt-2">{children}</div>}
      </CCardBody>
    </CCard>
  </Shell>
)

const ReviewPage = () => {
  const { token } = useParams()
  const { data, isLoading, error, refetch, isFetching } = useReview(token)

  if (isLoading) {
    return (
      <Shell>
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      </Shell>
    )
  }

  if (error) {
    const errStatus = error instanceof ApiError ? error.status : null
    // 404 = token not found or revoked (final — no retry, no technical details shown).
    if (errStatus === 404) {
      return (
        <InfoView title="Enlace no válido">
          Este enlace no es válido o fue reemplazado. Pide a tu vendedor uno nuevo.
        </InfoView>
      )
    }
    if (errStatus == null) {
      return (
        <Shell>
          <CCard>
            <CCardBody className="text-center py-5">
              <h5>No se pudo cargar</h5>
              <div className="text-body-secondary mb-3">Revisa tu conexión e intenta de nuevo.</div>
              <CButton color="primary" onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? <CSpinner size="sm" /> : 'Reintentar'}
              </CButton>
            </CCardBody>
          </CCard>
        </Shell>
      )
    }
    return <InfoView title="Ocurrió un error">{error.message}</InfoView>
  }

  if (!token || !data) return null

  const status = data.status

  const header = (
    <CCard className="mb-3">
      <CCardBody>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="mb-1">{data.reference}</h5>
            <div className="text-body-secondary small">Cliente: {data.clientName}</div>
            {/* Commercial reference (project/site), the same text printed on the proforma. */}
            <ReferenceNote notes={data.notes} variant="header" />
          </div>
          <div className="text-end small">
            {status === 'sent' && data.expiresAt && (
              <div>
                Válida hasta el <strong>{fmtDate(data.expiresAt)}</strong>
              </div>
            )}
            {data.confirmedAt && (
              <div className="text-body-secondary">Confirmada: {fmtDateTime(data.confirmedAt)}</div>
            )}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )

  if (status === 'sent' || status === 'changes_requested') {
    return (
      <Shell>
        {status === 'changes_requested' && (
          <CAlert color="info" className="mb-3">
            <strong>Pediste cambios — el taller está ajustando tu cotización.</strong>
            {data.clientNote && (
              <div className="mt-1 small">Tu nota: &ldquo;{data.clientNote}&rdquo;</div>
            )}
          </CAlert>
        )}
        {header}
        <ReviewSummary data={data} />
        <CCard className="mb-3">
          <CCardBody>
            <ReviewActions token={token} />
          </CCardBody>
        </CCard>
      </Shell>
    )
  }

  if (status === 'confirmed') {
    return (
      <Shell>
        <CAlert color="success">
          Tu pedido <strong>{data.orderCode}</strong> está confirmado
          {data.confirmedAt ? ` (${fmtDateTime(data.confirmedAt)})` : ''}.
        </CAlert>
        {header}
        <ReviewSummary data={data} />
      </Shell>
    )
  }

  if (status === 'expired') {
    return (
      <InfoView title="Cotización vencida">
        Esta cotización venció{data.expiresAt ? ` el ${fmtDate(data.expiresAt)}` : ''}. Contacta a
        ventas para solicitar una nueva.
      </InfoView>
    )
  }

  if (status === 'rejected') {
    return (
      <InfoView title="Cotización rechazada">
        Esta cotización fue rechazada. Contacta a ventas para más información.
      </InfoView>
    )
  }

  if (status === 'cancelled') {
    return (
      <InfoView title="Cotización retirada">
        Esta cotización ya no está disponible. Contacta a ventas para más información.
      </InfoView>
    )
  }

  return <InfoView title="Estado no disponible">{`Estado: ${status}`}</InfoView>
}

export default ReviewPage
