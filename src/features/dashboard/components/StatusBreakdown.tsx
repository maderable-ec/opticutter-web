import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { useStatusBreakdown } from '../useAnalytics'

const fmtUSD = (n: number) =>
  '$ ' + n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Color per status key. The chart renders dynamically from the API `items`; unknown keys
// fall back to neutral gray (see the lookup below).
const STATUS_COLOR: Record<string, string> = {
  confirmed: 'rgba(13, 202, 240, 0.7)',
  approved: 'rgba(13, 202, 240, 0.85)',
  queued: 'rgba(255, 193, 7, 0.7)',
  in_production: 'rgba(255, 193, 7, 0.7)', // histórico (renombrado a `queued`)
  cut: 'rgba(255, 193, 7, 0.85)',
  completed: 'rgba(25, 135, 84, 0.8)',
  cancelled: 'rgba(220, 53, 69, 0.7)',
}

interface StatusBreakdownProps {
  from: string
  to: string
  branchId?: number
}

const StatusBreakdown = ({ from, to, branchId }: StatusBreakdownProps) => {
  const { data, isLoading, error } = useStatusBreakdown(from, to, branchId)

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      )
    }

    if (error) {
      return <div className="text-danger small py-3">Error cargando embudo: {error.message}</div>
    }

    const items = data?.items ?? []
    const allZero = items.every((i) => i.orderCount === 0)

    if (allZero) {
      return (
        <div className="text-body-secondary text-center py-5 small">
          Sin órdenes en el período seleccionado
        </div>
      )
    }

    return (
      <CChartBar
        style={{ height: '280px' }}
        data={{
          labels: items.map((i) => i.label),
          datasets: [
            {
              label: 'Órdenes',
              data: items.map((i) => i.orderCount),
              backgroundColor: items.map((i) => STATUS_COLOR[i.key] ?? 'rgba(108,117,125,0.5)'),
              borderRadius: 4,
            },
          ],
        }}
        options={{
          indexAxis: 'y',
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  const revenue = items[ctx.dataIndex]?.revenue ?? 0
                  return revenue > 0 ? `Ingresos: ${fmtUSD(revenue)}` : ''
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: getStyle('--cui-border-color-translucent') },
              ticks: { color: getStyle('--cui-body-color'), precision: 0 },
            },
            y: {
              grid: { display: false },
              ticks: { color: getStyle('--cui-body-color') },
            },
          },
        }}
      />
    )
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="small fw-semibold text-body-secondary">Embudo de estados</CCardHeader>
      <CCardBody>{renderContent()}</CCardBody>
    </CCard>
  )
}

export default StatusBreakdown
