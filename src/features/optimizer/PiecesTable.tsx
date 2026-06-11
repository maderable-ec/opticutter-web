import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'

import type { BoardProduct } from 'src/features/products/types'
import { hasEdgeBanding, materialLabel, selectedSides } from './optimizerForm'
import type { MaterialForm, RequirementForm } from './optimizerForm'

interface PiecesTableProps {
  requirements: RequirementForm[]
  materials: MaterialForm[]
  boards: BoardProduct[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: <K extends keyof RequirementForm>(
    index: number,
    field: K,
    value: RequirementForm[K],
  ) => void
  onEditEdgeBanding: (index: number) => void
}

const PiecesTable = ({
  requirements,
  materials,
  boards,
  onAdd,
  onRemove,
  onUpdate,
  onEditEdgeBanding,
}: PiecesTableProps) => {
  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>
          Piezas <span className="text-danger">*</span>
        </strong>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          type="button"
          onClick={onAdd}
          disabled={materials.length === 0}
        >
          <CIcon icon={cilPlus} className="me-1" />
          Agregar pieza
        </CButton>
      </CCardHeader>
      <CCardBody>
        <div style={{ overflowX: 'auto' }}>
          <CTable small bordered className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Material</CTableHeaderCell>
                <CTableHeaderCell>Alto (mm)</CTableHeaderCell>
                <CTableHeaderCell>Ancho (mm)</CTableHeaderCell>
                <CTableHeaderCell>Cant.</CTableHeaderCell>
                <CTableHeaderCell>Prior.</CTableHeaderCell>
                <CTableHeaderCell>Etiqueta</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Rotar</CTableHeaderCell>
                <CTableHeaderCell>Tapacanto</CTableHeaderCell>
                <CTableHeaderCell />
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {requirements.map((req, i) => {
                const banded = hasEdgeBanding(req.edgeBanding)
                return (
                  <CTableRow key={i}>
                    <CTableDataCell style={{ minWidth: 170 }}>
                      <CFormSelect
                        size="sm"
                        value={req.materialUid}
                        onChange={(e) => onUpdate(i, 'materialUid', e.target.value)}
                      >
                        <option value="">Seleccionar…</option>
                        {materials.map((m) => (
                          <option key={m.uid} value={m.uid}>
                            {materialLabel(m, boards)}
                          </option>
                        ))}
                      </CFormSelect>
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 80 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={req.height}
                        onChange={(e) => onUpdate(i, 'height', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 80 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={req.width}
                        onChange={(e) => onUpdate(i, 'width', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        max={10000}
                        value={req.quantity}
                        onChange={(e) => onUpdate(i, 'quantity', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        value={req.priority}
                        onChange={(e) => onUpdate(i, 'priority', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 120 }}>
                      <CFormInput
                        size="sm"
                        value={req.label}
                        onChange={(e) => onUpdate(i, 'label', e.target.value)}
                        placeholder="Puerta izq."
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-center" style={{ minWidth: 60 }}>
                      <CFormCheck
                        checked={req.canRotate}
                        onChange={(e) => onUpdate(i, 'canRotate', e.target.checked)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 110 }}>
                      <CButton
                        size="sm"
                        color={banded ? 'info' : 'secondary'}
                        variant={banded ? 'outline' : 'ghost'}
                        type="button"
                        onClick={() => onEditEdgeBanding(i)}
                      >
                        {banded ? `${selectedSides(req.edgeBanding).length} lados` : '+ Tapacanto'}
                      </CButton>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        variant="ghost"
                        color="danger"
                        type="button"
                        disabled={requirements.length === 1}
                        onClick={() => onRemove(i)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default PiecesTable
