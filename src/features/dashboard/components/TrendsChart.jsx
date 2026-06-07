import React, { useEffect, useRef } from 'react'
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { useTimeseries } from '../useAnalytics'

const formatBucketLabel = (bucket, granularity) => {
  const date = new Date(bucket + 'T00:00:00')
  if (granularity === 'month') {
    return date.toLocaleDateString('es', { month: 'short', year: 'numeric' })
  }
  if (granularity === 'week') {
    return `Sem. del ${date.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
  }
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

const TrendsChart = ({ from, to, granularity }) => {
  const chartRef = useRef(null)
  const { data, isLoading, error } = useTimeseries(from, to, granularity)

  useEffect(() => {
    const handleColorSchemeChange = () => {
      if (chartRef.current) {
        setTimeout(() => {
          chartRef.current.options.scales.x.grid.color = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.x.ticks.color = getStyle('--cui-body-color')
          chartRef.current.options.scales.y.grid.color = getStyle('--cui-border-color-translucent')
          chartRef.current.options.scales.y.ticks.color = getStyle('--cui-body-color')
          chartRef.current.options.scales.y1.ticks.color = getStyle('--cui-body-color')
          chartRef.current.update()
        })
      }
    }
    document.documentElement.addEventListener('ColorSchemeChange', handleColorSchemeChange)
    return () => document.documentElement.removeEventListener('ColorSchemeChange', handleColorSchemeChange)
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
      return <div className="text-danger small py-3">Error cargando tendencias: {error.message}</div>
    }

    if (!data?.buckets?.length) {
      return <div className="text-body-secondary text-center py-5 small">Sin datos en el período seleccionado</div>
    }

    const labels = data.buckets.map((b) => formatBucketLabel(b, granularity))
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
