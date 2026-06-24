import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
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
  emptyRequirement,
  hasEdgeBanding,
  isRequirementEmpty,
  isRequirementValid,
  materialLabel,
  piecesSummary,
  selectedSides,
  validMaterialUids,
} from './optimizerForm'
import type { MaterialForm } from './optimizerForm'
import { parsePieces } from './piecesCsv'
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

// Campos en los que se puede pegar una columna de valores para crear filas.
const PASTEABLE_FIELDS = new Set(['height', 'width', 'quantity', 'priority', 'label'])

// Parsea formato rápido: "720x400", "720x400x4", "720x400x4 Etiqueta".
// Separador: x, X, ×, *. Decimal: punto o coma.
const QUICK_REGEX =
  /^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[xX×*]\s*(\d+(?:[.,]\d+)?))?(?:\s+(.+))?$/

const parseQuickEntry = (
  text: string,
): { height: number; width: number; quantity: number; label: string } | null => {
  const m = text.trim().match(QUICK_REGEX)
  if (!m) return null
  const toNum = (s?: string) => (s ? Number(s.replace(',', '.')) : 0)
  return {
    height: toNum(m[1]),
    width: toNum(m[2]),
    quantity: m[3] ? Math.max(1, Math.round(toNum(m[3]))) : 1,
    label: (m[4] ?? '').trim(),
  }
}

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
    addMany,
    remove,
    duplicate,
    duplicateSelected,
    update,
    removeSelected,
    fillDown,
    clear,
    toggleSelect,
    selectAll,
    pasteIntoField,
    pasteRows,
    undo,
    canUndo,
  } = editor

  const containerRef = useRef<HTMLDivElement>(null)
  const [quickText, setQuickText] = useState('')
  const [quickError, setQuickError] = useState('')

  // Foco programático a una celda por posición (data-row / data-col).
  const focusCell = useCallback((row: number, col: number) => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`,
    )
    el?.focus()
    if (el instanceof HTMLInputElement) el.select()
  }, [])

  // Tras agregar una fila, enfoca su primer input de medida para seguir tipeando sin tocar el mouse.
  useEffect(() => {
    if (focusRow == null) return
    focusCell(focusRow, 1)
    clearFocus()
  }, [focusRow, focusCell, clearFocus])

  // Ctrl+Z / Cmd+Z: deshace la última operación estructural (no aplica cuando el foco está en un input).
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  const validUids = validMaterialUids(materials)
  const summary = piecesSummary(requirements, materials)
  const allSelected = requirements.length > 0 && selected.size === requirements.length
  // Sin selección el fill-down/acciones aplican a todas; con selección, solo a las marcadas.
  const fillScope = selected.size > 0 ? 'selected' : 'all'
  const hasSelection = selected.size > 0

  // Navegación con teclado en la grid de piezas.
  // Col 0 = material (select), 1 = alto, 2 = ancho, 3 = cant, 4 = prior, 5 = etiqueta.
  // ArrowUp/Down en col 0 se dejan al browser (navegan opciones del select).
  // ArrowLeft/Right en col 5 (texto) solo navegan si el cursor está en el borde de la cadena.
  const LAST_COL = 5
  const handleKeyDown = (
    e: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    colIndex: number,
  ) => {
    switch (e.key) {
      case 'Enter':
        if (colIndex === 0) return // el select usa Enter para abrir/cerrar
        e.preventDefault()
        if (rowIndex === requirements.length - 1) add()
        else focusCell(rowIndex + 1, colIndex)
        break

      case 'ArrowDown':
        if (colIndex === 0) return // select navega sus propias opciones
        e.preventDefault()
        focusCell(rowIndex + 1, colIndex)
        break

      case 'ArrowUp':
        if (colIndex === 0) return
        e.preventDefault()
        if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
        break

      case 'ArrowRight': {
        if (colIndex === LAST_COL) {
          // Input de texto: solo salir cuando el cursor ya está al final
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== inp.value.length) return
          e.preventDefault()
          if (rowIndex < requirements.length - 1) focusCell(rowIndex + 1, 0)
          break
        }
        e.preventDefault()
        focusCell(rowIndex, colIndex + 1)
        break
      }

      case 'ArrowLeft': {
        if (colIndex === LAST_COL) {
          // Input de texto: solo salir cuando el cursor ya está al inicio
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== 0) return
          e.preventDefault()
          focusCell(rowIndex, colIndex - 1)
          break
        }
        if (colIndex === 0) {
          // Select: ir al último campo de la fila anterior
          e.preventDefault()
          if (rowIndex > 0) focusCell(rowIndex - 1, LAST_COL)
          break
        }
        e.preventDefault()
        focusCell(rowIndex, colIndex - 1)
        break
      }
    }
  }

  // Paste sobre la tabla: sobreescribe desde la fila activa y crea filas nuevas si hacen falta.
  // Multi-columna (TSV) → pasteRows; columna única → pasteIntoField.
  const handleTablePaste = useCallback(
    (e: ClipboardEvent) => {
      const text = e.clipboardData.getData('text')
      if (!text) return
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (lines.length <= 1) return

      const active = document.activeElement as HTMLElement | null
      const rawRow = Number(active?.dataset.row)
      const startRow = isNaN(rawRow) ? 0 : rawRow

      if (text.includes('\t')) {
        // Rango multi-columna copiado de hoja de cálculo → sobreescribir desde startRow.
        e.preventDefault()
        const { rows } = parsePieces(text, materials, boards)
        if (rows.length) pasteRows(startRow, rows)
        return
      }

      // Columna única: sobreescribir el campo activo en filas existentes y crear las que faltan.
      if (!(active instanceof HTMLInputElement)) return
      const field = active.dataset.field as 'height' | 'width' | 'quantity' | 'priority' | 'label'
      if (!field || !PASTEABLE_FIELDS.has(field) || isNaN(rawRow)) return
      e.preventDefault()
      pasteIntoField(startRow, field, lines)
    },
    [materials, boards, pasteRows, pasteIntoField],
  )

  // Campo de ingreso rápido: "720×400×4 Etiqueta" → agrega pieza al presionar Enter.
  const handleQuickEntry = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (!quickText.trim()) return
    const parsed = parseQuickEntry(quickText)
    if (!parsed) {
      setQuickError('Formato: 720×400 o 720×400×4 Etiqueta')
      return
    }
    const inheritUid =
      requirements[requirements.length - 1]?.materialUid || materials[0]?.uid || ''
    const req = emptyRequirement(inheritUid)
    req.height = parsed.height
    req.width = parsed.width
    req.quantity = parsed.quantity
    req.label = parsed.label
    addMany([req], false)
    setQuickText('')
    setQuickError('')
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
          {canUndo && (
            <CButton
              size="sm"
              color="secondary"
              variant="ghost"
              type="button"
              title="Deshacer (Ctrl+Z)"
              onClick={undo}
            >
              ↩ Deshacer
            </CButton>
          )}
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
        <div style={{ overflowX: 'auto' }} ref={containerRef} onPaste={handleTablePaste}>
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
                <CTableHeaderCell>
                  Alto (mm)
                  {renderFill('height', 'Igualar alto')}
                </CTableHeaderCell>
                <CTableHeaderCell>
                  Ancho (mm)
                  {renderFill('width', 'Igualar ancho')}
                </CTableHeaderCell>
                <CTableHeaderCell>
                  Cant.
                  {renderFill('quantity', 'Igualar cantidad')}
                </CTableHeaderCell>
                <CTableHeaderCell>
                  Prior.
                  {renderFill('priority', 'Igualar prioridad')}
                </CTableHeaderCell>
                <CTableHeaderCell>
                  Etiqueta
                  {renderFill('label', 'Igualar etiqueta')}
                </CTableHeaderCell>
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
                        data-row={i}
                        data-col={0}
                        onChange={(e) => update(i, 'materialUid', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 0)}
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
                        data-row={i}
                        data-col={1}
                        data-field="height"
                        value={req.height}
                        onChange={(e) => update(i, 'height', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 1)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 80 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        data-row={i}
                        data-col={2}
                        data-field="width"
                        value={req.width}
                        onChange={(e) => update(i, 'width', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 2)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        max={10000}
                        data-row={i}
                        data-col={3}
                        data-field="quantity"
                        value={req.quantity}
                        onChange={(e) => update(i, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 3)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        data-row={i}
                        data-col={4}
                        data-field="priority"
                        value={req.priority}
                        onChange={(e) => update(i, 'priority', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 4)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 120 }}>
                      <CFormInput
                        size="sm"
                        data-row={i}
                        data-col={5}
                        data-field="label"
                        value={req.label}
                        onChange={(e) => update(i, 'label', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 5)}
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

        {/* Ingreso rápido: escribe "720×400×4 Etiqueta" y presiona Enter para agregar la pieza */}
        <div className="d-flex align-items-center gap-2 mt-2">
          <CFormInput
            size="sm"
            value={quickText}
            onChange={(e) => {
              setQuickText(e.target.value)
              setQuickError('')
            }}
            onKeyDown={handleQuickEntry}
            placeholder="720×400×4  Etiqueta  (Enter para agregar)"
            disabled={materials.length === 0}
            invalid={!!quickError}
            style={{ maxWidth: 360 }}
          />
          {quickError && <small className="text-danger">{quickError}</small>}
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
