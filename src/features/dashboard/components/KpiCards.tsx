import type { ReactNode } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from '@coreui/react'
import { useSummary } from '../useAnalytics'
import { fmtMoney } from 'src/shared/utils/format'

const fmtPct = (rate: number) => `${(rate * 100).toFixed(1)} %`
const fmtEff = (val: number) => `${val.toFixed(1)} %`
const fmtM2 = (n: number) => `${n.toFixed(1)} m²`

interface StatCardProps {
  label: string
  value: ReactNode
  color?: string
}

const StatCard = ({ label, value, color = 'info' }: StatCardProps) => (
  <div className={`border-start border-start-4 border-start-${color} py-1 px-3 h-100`}>
    <div className="text-body-secondary text-truncate small">{label}</div>
    <div className="fs-5 fw-semibold">{value}</div>
  </div>
)

interface KpiCardsProps {
  from: string
  to: string
  branchId?: number
}

const KpiCards = ({ from, to, branchId }: KpiCardsProps) => {
  const { data, isLoading, error } = useSummary(from, to, branchId)

  if (isLoading) {
    return (
      <div className="text-center py-4 mb-4">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error) {
    return <div className="text-danger small mb-4">Error cargando KPIs: {error.message}</div>
  }

  if (!data) return null

  const s = data

  return (
    <>
      <CCard className="mb-3">
        <CCardHeader className="small fw-semibold text-body-secondary">Operación</CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={6} md={3}>
              <StatCard label="Tableros consumidos" value={s.totalBoardsConsumed} color="primary" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard
                label="Eficiencia promedio"
                value={fmtEff(s.averageEfficiency)}
                color="success"
              />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Área cortada" value={fmtM2(s.totalAreaCutM2)} color="info" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Merma estimada" value={fmtM2(s.wasteEstimateM2)} color="warning" />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-3">
        <CCardHeader className="small fw-semibold text-body-secondary">
          Pipeline y salud
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={6} md={6}>
              <StatCard label="Órdenes pendientes" value={s.pendingOrdersCount} color="info" />
            </CCol>
            <CCol xs={6} md={6}>
              <StatCard
                label="Tasa de cancelación"
                value={fmtPct(s.cancellationRate)}
                color="danger"
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="small fw-semibold text-body-secondary">Comercial</CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={6} md={3}>
              <StatCard
                label="Ingresos realizados"
                value={fmtMoney(s.realizedRevenue)}
                color="success"
              />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Ticket promedio" value={fmtMoney(s.averageTicket)} color="info" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Total de órdenes" value={s.orderCount} color="secondary" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Clientes activos" value={s.activeClientsCount} color="primary" />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default KpiCards
