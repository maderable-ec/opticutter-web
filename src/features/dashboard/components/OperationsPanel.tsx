import { CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import { useOperations } from '../useAnalytics'

const fmtEff = (val: number) => `${val.toFixed(1)} %`
const fmtM2 = (n: number) => `${n.toFixed(1)} m²`
const fmtHours = (h: number) =>
  h > 48 ? `${Math.floor(h / 24)}d ${Math.round(h % 24)}h` : `${h.toFixed(1)} h`

const TRANSITION_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  approved: 'Aprobada',
  in_production: 'En producción',
  cut: 'Cortada',
  completed: 'Completada',
}

interface OperationsPanelProps {
  from: string
  to: string
}

const OperationsPanel = ({ from, to }: OperationsPanelProps) => {
  const { data, isLoading, error } = useOperations(from, to)

  if (isLoading) {
    return (
      <CCard className="mb-4">
        <CCardHeader className="small fw-semibold text-body-secondary">
          Operación y eficiencia
        </CCardHeader>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard className="mb-4">
        <CCardHeader className="small fw-semibold text-body-secondary">
          Operación y eficiencia
        </CCardHeader>
        <CCardBody>
          <div className="text-danger small">Error cargando operaciones: {error.message}</div>
        </CCardBody>
      </CCard>
    )
  }

  if (!data) return null

  const lifecycle = data.lifecycle ?? []

  const lifecycleChart =
    lifecycle.length > 0 ? (
      <CChartBar
        style={{ height: '220px' }}
        data={{
          labels: lifecycle.map((t) => {
            const fromLabel = TRANSITION_LABEL[t.fromStatus] ?? t.fromStatus
            const toLabel = TRANSITION_LABEL[t.toStatus] ?? t.toStatus
            return `${fromLabel} → ${toLabel}`
          }),
          datasets: [
            {
              label: 'Horas promedio',
              data: lifecycle.map((t) => t.avgHours),
              backgroundColor: `rgba(${getStyle('--cui-info-rgb')}, 0.7)`,
              borderRadius: 4,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const t = lifecycle[ctx.dataIndex]
                  return [
                    `Tiempo: ${fmtHours(t.avgHours)}`,
                    `Muestra: ${t.sampleCount} transiciones`,
                  ]
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: getStyle('--cui-body-color'), font: { size: 10 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: getStyle('--cui-border-color-translucent') },
              ticks: {
                color: getStyle('--cui-body-color'),
                callback: (v) => `${v} h`,
                maxTicksLimit: 5,
              },
            },
          },
        }}
      />
    ) : (
      <div className="text-body-secondary text-center py-4 small">
        Sin historial de ciclo de vida en el período
      </div>
    )

  return (
    <CCard className="mb-4">
      <CCardHeader className="small fw-semibold text-body-secondary">
        Operación y eficiencia
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 mb-4">
          <CCol xs={6}>
            <div className="border-start border-start-4 border-start-success py-1 px-3">
              <div className="text-body-secondary small">Eficiencia promedio</div>
              <div className="fs-3 fw-bold text-success">{fmtEff(data.averageEfficiency)}</div>
            </div>
          </CCol>
          <CCol xs={6}>
            <div className="border-start border-start-4 border-start-info py-1 px-3">
              <div className="text-body-secondary small">Área cortada</div>
              <div className="fs-5 fw-semibold">{fmtM2(data.totalAreaCutM2)}</div>
            </div>
          </CCol>
          <CCol xs={6}>
            <div className="border-start border-start-4 border-start-danger py-1 px-3">
              <div className="text-body-secondary small">Merma estimada</div>
              <div className="fs-5 fw-semibold">{fmtM2(data.wasteEstimateM2)}</div>
            </div>
          </CCol>
        </CRow>
        <div className="small fw-semibold text-body-secondary mb-2">Tiempo por etapa</div>
        {lifecycleChart}
      </CCardBody>
    </CCard>
  )
}

export default OperationsPanel
