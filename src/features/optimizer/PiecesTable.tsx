import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ClipboardEvent, KeyboardEvent } from 'react'
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

import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import {
  CANTO_NOTATION_RE,
  CANTO_NOTATIONS,
  emptyRequirement,
  isRequirementEmpty,
  isRequirementValid,
  materialLabel,
  notationFromSides,
  piecesSummary,
  sidesFromNotation,
  validMaterialUids,
} from './optimizerForm'
import type { EdgeSide } from './types'
import type { MaterialForm } from './optimizerForm'
import { parsePieces } from './piecesCsv'
import type { FillableField, PiecesEditor } from './usePiecesEditor'

interface PiecesTableProps {
  editor: PiecesEditor
  materials: MaterialForm[]
  boards: BoardProduct[]
  edgeBandings: EdgeBandingProduct[]
  onImportOpen: () => void
  onExport: () => void
}

const areaFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

// Campos en los que se puede pegar una columna de valores para crear filas.
const PASTEABLE_FIELDS = new Set(['height', 'width', 'quantity', 'priority', 'label'])

// Mapeo data-col → campo. Cols 6 y 7 (canto y tapacanto) ambas propagan 'edgeBanding'.
const COL_FIELDS: FillableField[] = [
  'materialUid', // col 0
  'height',      // col 1
  'width',       // col 2
  'quantity',    // col 3
  'priority',    // col 4
  'label',       // col 5
  'edgeBandingSides',     // col 6 — Canto (solo lados)
  'edgeBandingProductId', // col 7 — Tapacanto (solo producto)
]

// Tirador ("fill handle") en la esquina inferior-derecha de la celda activa.
const handleStyle: CSSProperties = {
  position: 'absolute',
  right: 1,
  bottom: 1,
  width: 9,
  height: 9,
  background: 'var(--cui-primary)',
  border: '1px solid var(--cui-white, #fff)',
  borderRadius: 1,
  cursor: 'ns-resize',
  touchAction: 'none',
  zIndex: 3,
}

// Parsea formato rápido: "720x400", "720x400x4", "720x400x4 Etiqueta", "720x400x4 Etiqueta 1L2C".
// Separador: x, X, ×, *. Decimal: punto o coma.
// La notación de canto (1L, 2L, 1C, 2C, 1L1C, 1L2C, 2L1C, 4L) va al FINAL, después de la etiqueta.
const QUICK_REGEX =
  /^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[xX×*]\s*(\d+(?:[.,]\d+)?))?(?:\s+(.+))?$/

const parseQuickEntry = (
  text: string,
): { height: number; width: number; quantity: number; label: string; notation: string | null } | null => {
  const m = text.trim().match(QUICK_REGEX)
  if (!m) return null
  const toNum = (s?: string) => (s ? Number(s.replace(',', '.')) : 0)
  const remaining = (m[4] ?? '').trim()
  let notation: string | null = null
  let label = remaining
  if (remaining) {
    const parts = remaining.split(/\s+/)
    const last = parts[parts.length - 1]
    if (CANTO_NOTATION_RE.test(last)) {
      notation = last.toUpperCase()
      label = parts.slice(0, -1).join(' ')
    }
  }
  return {
    height: toNum(m[1]),
    width: toNum(m[2]),
    quantity: m[3] ? Math.max(1, Math.round(toNum(m[3]))) : 1,
    label: label.trim(),
    notation,
  }
}

// Miniatura SVG: la pieza se muestra girada 90° en sentido horario, por lo que
// los lados largos (L = left/right de la pieza) quedan como barras horizontales top/bottom,
// y los lados cortos (C = top/bottom de la pieza) quedan como barras verticales left/right.
const CantoPreview = ({ sides }: { sides: Record<EdgeSide, boolean> }) => (
  <svg width="28" height="18" viewBox="0 0 28 18" style={{ flexShrink: 0 }}>
    <rect x="1" y="1" width="26" height="16" fill="none" stroke="#adb5bd" strokeWidth="1" />
    {sides.left   && <line x1="1"  y1="1"  x2="27" y2="1"  stroke="#d9480f" strokeWidth="2" />}
    {sides.right  && <line x1="1"  y1="17" x2="27" y2="17" stroke="#d9480f" strokeWidth="2" />}
    {sides.bottom && <line x1="1"  y1="1"  x2="1"  y2="17" stroke="#d9480f" strokeWidth="2" />}
    {sides.top    && <line x1="27" y1="1"  x2="27" y2="17" stroke="#d9480f" strokeWidth="2" />}
  </svg>
)

const PiecesTable = ({
  editor,
  materials,
  boards,
  edgeBandings,
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
    fillRange,
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
  // Celda donde se muestra el tirador de arrastre (sigue al foco, como el "active cell" de Excel).
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  // Arrastre en curso del tirador. `targetRow` es la fila bajo el puntero (clampeada a la lista).
  const [drag, setDrag] = useState<{ srcRow: number; col: number; targetRow: number } | null>(null)

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
  // Col 0 = material (select), 1 = alto, 2 = ancho, 3 = cant, 4 = prior, 5 = etiqueta,
  // 6 = canto (select), 7 = tapacanto (select).
  // ArrowUp/Down en cols select (0, 6, 7) se dejan al browser.
  // ArrowLeft/Right en col 5 (texto) solo navegan si el cursor está en el borde de la cadena.
  const LAST_COL = 7
  const SELECT_COLS = new Set([0, 6, 7])
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case 'Enter':
        if (SELECT_COLS.has(colIndex)) return // los selects usan Enter para abrir/cerrar
        e.preventDefault()
        if (rowIndex === requirements.length - 1) add()
        else focusCell(rowIndex + 1, colIndex)
        break

      case 'ArrowDown':
        if (SELECT_COLS.has(colIndex)) return // select navega sus propias opciones
        e.preventDefault()
        focusCell(rowIndex + 1, colIndex)
        break

      case 'ArrowUp':
        if (SELECT_COLS.has(colIndex)) return
        e.preventDefault()
        if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
        break

      case 'ArrowRight': {
        if (colIndex === LAST_COL) {
          e.preventDefault()
          if (rowIndex < requirements.length - 1) focusCell(rowIndex + 1, 0)
          break
        }
        if (colIndex === 5) {
          // Input de texto: solo salir cuando el cursor ya está al final
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== inp.value.length) return
        }
        e.preventDefault()
        focusCell(rowIndex, colIndex + 1)
        break
      }

      case 'ArrowLeft': {
        if (colIndex === 5) {
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

  // Campo de ingreso rápido: "720×400×4 Etiqueta 1L2C" → agrega pieza al presionar Enter.
  const handleQuickEntry = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (!quickText.trim()) return
    const parsed = parseQuickEntry(quickText)
    if (!parsed) {
      setQuickError('Formato: 720×400 o 720×400×4 Etiqueta 1L2C')
      return
    }
    const inheritUid = requirements[requirements.length - 1]?.materialUid || materials[0]?.uid || ''
    const req = emptyRequirement(inheritUid)
    req.height = parsed.height
    req.width = parsed.width
    req.quantity = parsed.quantity
    req.label = parsed.label
    if (parsed.notation) {
      const lastEb = requirements[requirements.length - 1]?.edgeBanding
      req.edgeBanding = {
        productId: lastEb?.productId ?? '',
        sides: sidesFromNotation(parsed.notation),
      }
    }
    addMany([req], false)
    setQuickText('')
    setQuickError('')
  }

  // Fila bajo la coordenada Y del puntero (clampeada al rango de filas existentes).
  const rowFromY = (y: number): number => {
    const rows = containerRef.current?.querySelectorAll('tbody tr')
    if (!rows || rows.length === 0) return 0
    for (let idx = 0; idx < rows.length; idx++) {
      if (y < rows[idx].getBoundingClientRect().bottom) return idx
    }
    return rows.length - 1
  }

  // ¿La celda (col, fila i) está dentro del rango que se está arrastrando?
  const inFillRange = (col: number, i: number): boolean => {
    if (!drag || drag.col !== col) return false
    return i >= Math.min(drag.srcRow, drag.targetRow) && i <= Math.max(drag.srcRow, drag.targetRow)
  }

  // Estilo de celda editable: posición relativa para anclar el tirador + resaltado del rango.
  const cellStyle = (col: number, i: number, minWidth: number): CSSProperties => ({
    minWidth,
    position: 'relative',
    ...(inFillRange(col, i) ? { boxShadow: 'inset 0 0 0 2px var(--cui-primary)' } : {}),
  })

  // Tirador arrastrable en la celda activa. Usa Pointer Events (mouse + touch) con captura de puntero.
  const renderHandle = (i: number, col: number) => {
    if (!activeCell || activeCell.row !== i || activeCell.col !== col) return null
    return (
      <span
        title="Arrastrar para clonar"
        style={handleStyle}
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag({ srcRow: i, col, targetRow: i })
        }}
        onPointerMove={(e) => {
          const target = rowFromY(e.clientY)
          setDrag((d) => (!d || d.targetRow === target ? d : { ...d, targetRow: target }))
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId)
          if (drag) fillRange(drag.srcRow, drag.targetRow, COL_FIELDS[drag.col])
          setDrag(null)
        }}
        onPointerCancel={() => setDrag(null)}
      />
    )
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
                  Canto
                  {renderFill('edgeBandingSides', 'Igualar lados de canto')}
                </CTableHeaderCell>
                <CTableHeaderCell>Tapacanto</CTableHeaderCell>
                <CTableHeaderCell />
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {requirements.map((req, i) => {
                const isError = !isRequirementValid(req, validUids) && !isRequirementEmpty(req)
                const cantoNotation = notationFromSides(req.edgeBanding.sides)
                return (
                  <CTableRow key={i} color={isError ? 'danger' : undefined}>
                    <CTableDataCell className="text-center">
                      <CFormCheck checked={selected.has(i)} onChange={() => toggleSelect(i)} />
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(0, i, 170)}>
                      <CFormSelect
                        size="sm"
                        value={req.materialUid}
                        data-row={i}
                        data-col={0}
                        onFocus={() => setActiveCell({ row: i, col: 0 })}
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
                      {renderHandle(i, 0)}
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(1, i, 80)}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        data-row={i}
                        data-col={1}
                        data-field="height"
                        value={req.height}
                        onFocus={() => setActiveCell({ row: i, col: 1 })}
                        onChange={(e) => update(i, 'height', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 1)}
                      />
                      {renderHandle(i, 1)}
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(2, i, 80)}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        data-row={i}
                        data-col={2}
                        data-field="width"
                        value={req.width}
                        onFocus={() => setActiveCell({ row: i, col: 2 })}
                        onChange={(e) => update(i, 'width', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 2)}
                      />
                      {renderHandle(i, 2)}
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(3, i, 70)}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        max={10000}
                        data-row={i}
                        data-col={3}
                        data-field="quantity"
                        value={req.quantity}
                        onFocus={() => setActiveCell({ row: i, col: 3 })}
                        onChange={(e) => update(i, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 3)}
                      />
                      {renderHandle(i, 3)}
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(4, i, 70)}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        data-row={i}
                        data-col={4}
                        data-field="priority"
                        value={req.priority}
                        onFocus={() => setActiveCell({ row: i, col: 4 })}
                        onChange={(e) => update(i, 'priority', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 4)}
                      />
                      {renderHandle(i, 4)}
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(5, i, 120)}>
                      <CFormInput
                        size="sm"
                        data-row={i}
                        data-col={5}
                        data-field="label"
                        value={req.label}
                        onFocus={() => setActiveCell({ row: i, col: 5 })}
                        onChange={(e) => update(i, 'label', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i, 5)}
                        placeholder="Puerta izq."
                      />
                      {renderHandle(i, 5)}
                    </CTableDataCell>
                    <CTableDataCell className="text-center" style={{ minWidth: 60 }}>
                      <CFormCheck
                        checked={req.canRotate}
                        onChange={(e) => update(i, 'canRotate', e.target.checked)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(6, i, 120)}>
                      <div className="d-flex align-items-center gap-1">
                        <CantoPreview sides={req.edgeBanding.sides} />
                        <CFormSelect
                          size="sm"
                          value={cantoNotation}
                          data-row={i}
                          data-col={6}
                          onFocus={() => setActiveCell({ row: i, col: 6 })}
                          onChange={(e) =>
                            update(i, 'edgeBanding', {
                              ...req.edgeBanding,
                              sides: sidesFromNotation(e.target.value),
                            })
                          }
                          onKeyDown={(e) => handleKeyDown(e, i, 6)}
                        >
                          {CANTO_NOTATIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </CFormSelect>
                      </div>
                      {renderHandle(i, 6)}
                    </CTableDataCell>
                    <CTableDataCell style={cellStyle(7, i, 140)}>
                      <CFormSelect
                        size="sm"
                        value={req.edgeBanding.productId}
                        disabled={cantoNotation === '—'}
                        data-row={i}
                        data-col={7}
                        onFocus={() => setActiveCell({ row: i, col: 7 })}
                        onChange={(e) =>
                          update(i, 'edgeBanding', {
                            ...req.edgeBanding,
                            productId: e.target.value,
                          })
                        }
                        onKeyDown={(e) => handleKeyDown(e, i, 7)}
                      >
                        <option value="">—</option>
                        {edgeBandings.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name}
                          </option>
                        ))}
                      </CFormSelect>
                      {renderHandle(i, 7)}
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

        {/* Ingreso rápido: "720×400×4 Etiqueta 1L2C" → agrega pieza al presionar Enter */}
        <div className="d-flex align-items-center gap-2 mt-2">
          <CFormInput
            size="sm"
            value={quickText}
            onChange={(e) => {
              setQuickText(e.target.value)
              setQuickError('')
            }}
            onKeyDown={handleQuickEntry}
            placeholder="720×400×4  Etiqueta  1L2C  (Enter para agregar)"
            disabled={materials.length === 0}
            invalid={!!quickError}
            style={{ maxWidth: 400 }}
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
