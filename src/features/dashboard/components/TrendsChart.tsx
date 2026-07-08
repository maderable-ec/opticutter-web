import { useEffect, useRef, type ComponentRef } from 'react'
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { useTimeseries } from '../useAnalytics'
import { fmtBucketLabel } from '../format'
import type { Granularity } from '../types'

// Minimal shape we mutate on theme change; the full Chart.js scale type is a
// DeepPartial that fights direct assignment, so we narrow to what we touch.
type MutableScale = {
  grid: { color: string | undefined }
  ticks: { color: string | undefined }
}

interface TrendsChartProps {
  from: string
  to: string
  granularity: Granularity
  branchId?: number
}

const TrendsChart = ({ from, to, granularity, branchId }: TrendsChartProps) => {
  const chartRef = useRef<ComponentRef<typeof CChartLine>>(null)
  const { data, isLoading, error } = useTimeseries(from, to, granularity, branchId)

  useEffect(() => {
    const handleColorSchemeChange = () => {
      const chart = chartRef.current
      if (chart) {
        setTimeout(() => {
          const scales = chart.options.scales as unknown as Record<string, MutableScale>
          scales.x.grid.color = getStyle('--cui-border-color-translucent')
          scales.x.ticks.color = getStyle('--cui-body-color')
          scales.y.grid.color = getStyle('--cui-border-color-translucent')
          scales.y.ticks.color = getStyle('--cui-body-color')
          scales.y1.ticks.color = getStyle('--cui-body-color')
          chart.update()
        })
      }
    }
    document.documentElement.addEventListener('ColorSchemeChange', handleColorSchemeChange)
    return () =>
      document.documentElement.removeEventListener('ColorSchemeChange', handleColorSchemeChange)
  }, [chartRef])

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
        <div className="text-danger small py-3">Error cargando tendencias: {error.message}</div>
      )
    }

    if (!data || data.buckets.length === 0) {
      return (
        <div className="text-body-secondary text-center py-5 small">
          Sin datos en el período seleccionado
        </div>
      )
    }

    const labels = data.buckets.map((b) => fmtBucketLabel(b, granularity))
    const { revenue, orderCount, boardsConsumed, newClients } = data.series

    return (
      <CChartLine
        ref={chartRef}
        style={{ height: '300px', marginTop: '16px' }}
        data={{
          labels,
          datasets: [
            {
              label: 'Ingresos (USD)',
              yAxisID: 'y',
              backgroundColor: `rgba(${getStyle('--cui-success-rgb')}, .1)`,
              borderColor: getStyle('--cui-success'),
              pointHoverBackgroundColor: getStyle('--cui-success'),
              borderWidth: 2,
              data: revenue,
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Órdenes',
              yAxisID: 'y1',
              backgroundColor: 'transparent',
              borderColor: getStyle('--cui-info'),
              pointHoverBackgroundColor: getStyle('--cui-info'),
              borderWidth: 2,
              data: orderCount,
              tension: 0.4,
            },
            {
              label: 'Tableros',
              yAxisID: 'y1',
              backgroundColor: 'transparent',
              borderColor: getStyle('--cui-warning'),
              pointHoverBackgroundColor: getStyle('--cui-warning'),
              borderWidth: 2,
              data: boardsConsumed,
              tension: 0.4,
            },
            {
              label: 'Nuevos clientes',
              yAxisID: 'y1',
              backgroundColor: 'transparent',
              borderColor: getStyle('--cui-primary'),
              pointHoverBackgroundColor: getStyle('--cui-primary'),
              borderWidth: 2,
              data: newClients,
              tension: 0.4,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
          },
          scales: {
            x: {
              grid: {
                color: getStyle('--cui-border-color-translucent'),
                drawOnChartArea: false,
              },
              ticks: { color: getStyle('--cui-body-color') },
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              beginAtZero: true,
              border: { color: getStyle('--cui-border-color-translucent') },
              grid: { color: getStyle('--cui-border-color-translucent') },
              ticks: {
                color: getStyle('--cui-body-color'),
                maxTicksLimit: 5,
                callback: (v) => `$${v.toLocaleString()}`,
              },
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              beginAtZero: true,
              grid: { drawOnChartArea: false },
              ticks: {
                color: getStyle('--cui-body-color'),
                maxTicksLimit: 5,
              },
            },
          },
          elements: {
            point: { radius: 0, hitRadius: 10, hoverRadius: 4, hoverBorderWidth: 3 },
          },
        }}
      />
    )
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="small fw-semibold text-body-secondary">Tendencias</CCardHeader>
      <CCardBody>{renderContent()}</CCardBody>
    </CCard>
  )
}

export default TrendsChart
