import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CButton,
  CButtonGroup,
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
import {
  cilArrowBottom,
  cilCloudDownload,
  cilCloudUpload,
  cilCopy,
  cilPlus,
  cilTrash,
} from '@coreui/icons'

import type { BoardProduct } from 'src/features/products/types'
import {
  hasEdgeBanding,
  isRequirementEmpty,
  isRequirementValid,
  materialLabel,
  piecesSummary,
  selectedSides,
  validMaterialUids,
} from './optimizerForm'
import type { MaterialForm } from './optimizerForm'
import type { FillableField, PiecesEditor } from './usePiecesEditor'

interface PiecesTableProps {
  editor: PiecesEditor
  materials: MaterialForm[]
  boards: BoardProduct[]
  onEditEdgeBanding: (index: number) => void
  onImportOpen: () => void
  onExport: () => void
}

const areaFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

const PiecesTable = ({
  editor,
  materials,
  boards,
  onEditEdgeBanding,
  onImportOpen,
  onExport,
}: PiecesTableProps) => {
  const {
    requirements,
    selected,
    focusRow,
    clearFocus,
    add,
    remove,
    duplicate,
    duplicateSelected,
    update,
    removeSelected,
    fillDown,
    clear,
    toggleSelect,
    selectAll,
  } = editor

  const containerRef = useRef<HTMLDivElement>(null)

  // Tras agregar una fila, enfoca su primer input de medida para seguir tipeando sin tocar el mouse.
  useEffect(() => {
    if (focusRow == null) return
    const rows = containerRef.current?.querySelectorAll('tbody tr')
    const input = rows?.[focusRow]?.querySelector<HTMLInputElement>('input[data-cell="height"]')
    input?.focus()
    input?.select()
    clearFocus()
  }, [focusRow, clearFocus])

  const validUids = validMaterialUids(materials)
  const summary = piecesSummary(requirements, materials)
  const allSelected = requirements.length > 0 && selected.size === requirements.length
  // Sin selección el fill-down/acciones aplican a todas; con selección, solo a las marcadas.
  const fillScope = selected.size > 0 ? 'selected' : 'all'
  const hasSelection = selected.size > 0

  // Enter en la última fila agrega una nueva (el foco lo gestiona el efecto de focusRow).
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex === requirements.length - 1) add()
    }
  }

  // Helper de render (no es componente): botón "rellenar hacia abajo" en una cabecera de columna.
  const renderFill = (field: FillableField, title: string) => (
    <CButton
      size="sm"
      variant="ghost"
      color="secondary"
      type="button"
      className="p-1 ms-1"
      title={`${title} (aplicar a ${fillScope === 'selected' ? 'seleccionadas' : 'todas'})`}
      onClick={() => fillDown(field, fillScope)}
    >
      <CIcon icon={cilArrowBottom} size="sm" />
    </CButton>
  )

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <strong>
          Piezas <span className="text-danger">*</span>
        </strong>
        <div className="d-flex flex-wrap gap-2">
          {hasSelection && (
            <CButtonGroup size="sm">
              <CButton
                color="secondary"
                variant="outline"
                type="button"
                onClick={duplicateSelected}
              >
                <CIcon icon={cilCopy} className="me-1" />
                Duplicar ({selected.size})
              </CButton>
              <CButton color="danger" variant="outline" type="button" onClick={removeSelected}>
                <CIcon icon={cilTrash} className="me-1" />
                Eliminar ({selected.size})
              </CButton>
            </CButtonGroup>
          )}
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            onClick={onImportOpen}
          >
            <CIcon icon={cilCloudUpload} className="me-1" />
            Importar / Pegar
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            onClick={onExport}
            disabled={summary.pieces === 0}
          >
            <CIcon icon={cilCloudDownload} className="me-1" />
            Exportar CSV
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            onClick={() => {
              if (window.confirm('¿Vaciar la lista de piezas?')) clear()
            }}
          >
            <CIcon icon={cilTrash} className="me-1" />
            Limpiar
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            onClick={add}
            disabled={materials.length === 0}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Agregar pieza
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <div style={{ overflowX: 'auto' }} ref={containerRef}>
          <CTable small bordered className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-center" style={{ width: 36 }}>
                  <CFormCheck
                    checked={allSelected}
                    onChange={(e) => selectAll(e.target.checked)}
                    title="Seleccionar todo"
                  />
                </CTableHeaderCell>
                <CTableHeaderCell>
                  Material
                  {renderFill('materialUid', 'Igualar material')}
                </CTableHeaderCell>
                <CTableHeaderCell>Alto (mm)</CTableHeaderCell>
                <CTableHeaderCell>Ancho (mm)</CTableHeaderCell>
                <CTableHeaderCell>Cant.</CTableHeaderCell>
                <CTableHeaderCell>Prior.</CTableHeaderCell>
                <CTableHeaderCell>Etiqueta</CTableHeaderCell>
                <CTableHeaderCell className="text-center">
                  Rotar
                  {renderFill('canRotate', 'Igualar rotación')}
                </CTableHeaderCell>
                <CTableHeaderCell>
                  Tapacanto
                  {renderFill('edgeBanding', 'Igualar tapacanto')}
                </CTableHeaderCell>
                <CTableHeaderCell />
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {requirements.map((req, i) => {
                const banded = hasEdgeBanding(req.edgeBanding)
                const isError = !isRequirementValid(req, validUids) && !isRequirementEmpty(req)
                return (
                  <CTableRow key={i} color={isError ? 'danger' : undefined}>
                    <CTableDataCell className="text-center">
                      <CFormCheck checked={selected.has(i)} onChange={() => toggleSelect(i)} />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 170 }}>
                      <CFormSelect
                        size="sm"
                        value={req.materialUid}
                        onChange={(e) => update(i, 'materialUid', e.target.value)}
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
                        data-cell="height"
                        value={req.height}
                        onChange={(e) => update(i, 'height', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 80 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={req.width}
                        onChange={(e) => update(i, 'width', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        max={10000}
                        value={req.quantity}
                        onChange={(e) => update(i, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        value={req.priority}
                        onChange={(e) => update(i, 'priority', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 120 }}>
                      <CFormInput
                        size="sm"
                        value={req.label}
                        onChange={(e) => update(i, 'label', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        placeholder="Puerta izq."
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-center" style={{ minWidth: 60 }}>
                      <CFormCheck
                        checked={req.canRotate}
                        onChange={(e) => update(i, 'canRotate', e.target.checked)}
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
                    <CTableDataCell className="text-nowrap">
                      <CButton
                        size="sm"
                        variant="ghost"
                        color="secondary"
                        type="button"
                        title="Duplicar pieza"
                        onClick={() => duplicate(i)}
                      >
                        <CIcon icon={cilCopy} />
                      </CButton>
                      <CButton
                        size="sm"
                        variant="ghost"
                        color="danger"
                        type="button"
                        title="Eliminar pieza"
                        disabled={requirements.length === 1}
                        onClick={() => remove(i)}
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
        <div className="d-flex flex-wrap gap-3 mt-2 small text-body-secondary">
          <span>
            <strong className="text-body">{summary.pieces}</strong> piezas
          </span>
          <span>
            <strong className="text-body">{summary.units}</strong> unidades
          </span>
          <span>
            área total <strong className="text-body">{areaFmt.format(summary.areaM2)} m²</strong>
          </span>
          {summary.invalid > 0 && (
            <span className="text-danger">{summary.invalid} con datos incompletos</span>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default PiecesTable
