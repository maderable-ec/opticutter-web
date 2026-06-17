import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { useBranchBreakdown } from '../useAnalytics'

const fmtUSD = (n: number) =>
  '$ ' + n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface BranchBreakdownProps {
  from: string
  to: string
  branchId?: number
}

const BranchBreakdown = ({ from, to, branchId }: BranchBreakdownProps) => {
  const { data, isLoading, error } = useBranchBreakdown(from, to, branchId)

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-danger small py-3">Error cargando comparativo: {error.message}</div>
      )
    }

    const items = data?.items ?? []
    const allZero = items.every((i) => i.orderCount === 0)

    if (items.length === 0 || allZero) {
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
              backgroundColor: `rgba(${getStyle('--cui-info-rgb')}, 0.7)`,
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
      <CCardHeader className="small fw-semibold text-body-secondary">
        Comparativo por sucursal
      </CCardHeader>
      <CCardBody>{renderContent()}</CCardBody>
    </CCard>
  )
}

export default BranchBreakdown
