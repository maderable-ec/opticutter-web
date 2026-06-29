import { CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from '@coreui/react'
import { useOperations } from '../useAnalytics'

const fmtEff = (val: number) => `${val.toFixed(1)} %`
const fmtM2 = (n: number) => `${n.toFixed(1)} m²`

interface OperationsPanelProps {
  from: string
  to: string
  branchId?: number
}

const OperationsPanel = ({ from, to, branchId }: OperationsPanelProps) => {
  const { data, isLoading, error } = useOperations(from, to, branchId)

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

  return (
    <CCard className="mb-4">
      <CCardHeader className="small fw-semibold text-body-secondary">
        Operación y eficiencia
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
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
      </CCardBody>
    </CCard>
  )
}

export default OperationsPanel
