import React from 'react'
import { useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CContainer, CSpinner } from '@coreui/react'

import OrderStatusBadge from 'src/features/orders/OrderStatusBadge'
import { useReview } from './useReview'
import { reviewApi } from './reviewApi'
import ReviewSummary from './ReviewSummary'
import ReviewActions from './ReviewActions'
import { fmtDate, fmtDateTime } from './format'

const CONFIRMED_STATES = ['confirmed', 'approved', 'in_production', 'cut', 'completed']

const Shell = ({ children }) => (
  <div className="min-vh-100 bg-body-tertiary py-4">
    <CContainer style={{ maxWidth: 880 }}>
      <div className="text-center mb-4">
        <h4 className="mb-0">Maderable</h4>
        <div className="text-body-secondary small">Revisión de cotización</div>
      </div>
      {children}
    </CContainer>
  </div>
)

const InfoView = ({ title, children }) => (
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
    // 404 = token inexistente o revocado (definitivo, sin reintento ni detalles técnicos).
    if (error.status === 404) {
      return (
        <InfoView title="Enlace no válido">
          Este enlace no es válido o fue reemplazado. Pedí a tu vendedor uno nuevo.
        </InfoView>
      )
    }
    // Sin status = fallo de red (TypeError de fetch) → reintentable.
    if (error.status == null) {
      return (
        <Shell>
          <CCard>
            <CCardBody className="text-center py-5">
              <h5>No se pudo cargar</h5>
              <div className="text-body-secondary mb-3">Revisá tu conexión e intentá de nuevo.</div>
              <CButton color="primary" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? <CSpinner size="sm" /> : 'Reintentar'}
              </CButton>
            </CCardBody>
          </CCard>
        </Shell>
      )
    }
    return <InfoView title="Ocurrió un error">{error.message}</InfoView>
  }

  const status = data.status

  const header = (
    <CCard className="mb-3">
      <CCardBody>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h5 className="mb-0">{data.orderCode}</h5>
              <OrderStatusBadge status={status} />
            </div>
            <div className="text-body-secondary small">Cliente: {data.clientName}</div>
          </div>
          <div className="text-end small">
            {status === 'quoted' && data.expiresAt && (
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

  if (status === 'quoted') {
    return (
      <Shell>
        {header}
        <ReviewSummary data={data} />
        <CCard className="mb-3">
          <CCardBody>
            <div className="mb-3">
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => reviewApi.downloadProforma(token)}
              >
                Descargar proforma (PDF)
              </CButton>
            </div>
            <ReviewActions token={token} />
          </CCardBody>
        </CCard>
      </Shell>
    )
  }

  if (CONFIRMED_STATES.includes(status)) {
    return (
      <Shell>
        <CAlert color="success">
          Tu pedido <strong>{data.orderCode}</strong> está confirmado
          {data.confirmedAt ? ` (${fmtDateTime(data.confirmedAt)})` : ''}.
        </CAlert>
        {header}
        <ReviewSummary data={data} />
        <CCard className="mb-3">
          <CCardBody>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => reviewApi.downloadProforma(token)}
            >
              Descargar proforma (PDF)
            </CButton>
          </CCardBody>
        </CCard>
      </Shell>
    )
  }

  if (status === 'expired') {
    return (
      <InfoView title="Cotización vencida">
        Esta cotización venció{data.expiresAt ? ` el ${fmtDate(data.expiresAt)}` : ''}. Contactá a
        ventas para solicitar una nueva.
      </InfoView>
    )
  }

  if (status === 'cancelled') {
    return (
      <InfoView title="Cotización rechazada o retirada">
        Esta cotización ya no está disponible. Contactá a ventas para más información.
      </InfoView>
    )
  }

  return <InfoView title="Estado no disponible">{`Estado: ${status}`}</InfoView>
}

export default ReviewPage
