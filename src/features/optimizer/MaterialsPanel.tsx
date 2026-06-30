import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'

import SearchableSelect from 'src/shared/components/SearchableSelect'
import type { BoardProduct } from 'src/features/products/types'
import type { MaterialSourceKind } from './types'
import { SOURCE_LABELS } from './optimizerForm'
import type { MaterialForm } from './optimizerForm'

const SOURCES: MaterialSourceKind[] = ['catalog', 'manual', 'companyOffcut', 'clientOffcut']

interface MaterialsPanelProps {
  materials: MaterialForm[]
  boards: BoardProduct[]
  onAdd: () => void
  onRemove: (uid: string) => void
  onUpdate: <K extends keyof MaterialForm>(uid: string, field: K, value: MaterialForm[K]) => void
}

const boardDims = (b?: BoardProduct) => {
  if (!b) return null
  const { height, width, thickness } = b.attributes
  if (!height || !width) return null
  return `${width}×${height}${thickness ? `×${thickness}` : ''} mm`
}

const MaterialsPanel = ({ materials, boards, onAdd, onRemove, onUpdate }: MaterialsPanelProps) => {
  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>
          Materiales <span className="text-danger">*</span>
        </strong>
        <CButton size="sm" color="secondary" variant="outline" type="button" onClick={onAdd}>
          <CIcon icon={cilPlus} className="me-1" />
          Agregar material
        </CButton>
      </CCardHeader>
      <CCardBody>
        {materials.map((m) => {
          const dims =
            m.source === 'catalog'
              ? boardDims(boards.find((b) => String(b.id) === String(m.boardId)))
              : null
          return (
            <div className="border rounded p-2 mb-2" key={m.uid}>
              <CRow className="g-2 align-items-end">
                <CCol xs={12} sm={4} md={3}>
                  <CFormLabel className="small mb-1">Fuente</CFormLabel>
                  <CFormSelect
                    size="sm"
                    value={m.source}
                    onChange={(e) =>
                      onUpdate(m.uid, 'source', e.target.value as MaterialSourceKind)
                    }
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {SOURCE_LABELS[s]}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                {m.source === 'catalog' ? (
                  <CCol xs={12} sm={6} md={7}>
                    <CFormLabel className="small mb-1">Tablero</CFormLabel>
                    <SearchableSelect
                      size="sm"
                      value={String(m.boardId)}
                      placeholder="Seleccionar…"
                      searchPlaceholder="Buscar por nombre o código…"
                      emptyText="Sin tableros que coincidan"
                      options={boards.map((b) => ({
                        value: String(b.id),
                        label: b.name,
                        sublabel: b.code,
                      }))}
                      onChange={(v) => onUpdate(m.uid, 'boardId', v)}
                    />
                    {dims && <div className="small text-body-secondary mt-1">{dims}</div>}
                  </CCol>
                ) : (
                  <>
                    <CCol xs={12} md={4}>
                      <CFormLabel className="small mb-1">Etiqueta</CFormLabel>
                      <CFormInput
                        size="sm"
                        value={m.label}
                        placeholder="Retazo bodega 3"
                        onChange={(e) => onUpdate(m.uid, 'label', e.target.value)}
                      />
                    </CCol>
                    <CCol xs={4} md={1}>
                      <CFormLabel className="small mb-1">Alto</CFormLabel>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={m.height}
                        onChange={(e) => onUpdate(m.uid, 'height', e.target.value)}
                      />
                    </CCol>
                    <CCol xs={4} md={1}>
                      <CFormLabel className="small mb-1">Ancho</CFormLabel>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={m.width}
                        onChange={(e) => onUpdate(m.uid, 'width', e.target.value)}
                      />
                    </CCol>
                    <CCol xs={4} md={1}>
                      <CFormLabel className="small mb-1">Grosor</CFormLabel>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={m.thickness}
                        onChange={(e) => onUpdate(m.uid, 'thickness', e.target.value)}
                      />
                    </CCol>
                    <CCol xs={6} md={2}>
                      <CFormLabel className="small mb-1">Costo unit.</CFormLabel>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        step="0.01"
                        value={m.costPerUnit}
                        onChange={(e) => onUpdate(m.uid, 'costPerUnit', e.target.value)}
                      />
                    </CCol>
                  </>
                )}

                <CCol xs="auto" className="ms-auto">
                  <CButton
                    size="sm"
                    variant="ghost"
                    color="danger"
                    type="button"
                    disabled={materials.length === 1}
                    onClick={() => onRemove(m.uid)}
                    title="Eliminar material"
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CCol>
              </CRow>
            </div>
          )
        })}
        {materials.length === 0 && (
          <div className="text-body-secondary small">Agrega al menos un material.</div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MaterialsPanel
