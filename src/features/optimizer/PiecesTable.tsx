import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import {
  CANTO_NOTATIONS,
  CANTO_NOTATION_RE,
  emptyRequirement,
  isRequirementEmpty,
  isRequirementValid,
  materialLabel,
  notationFromSides,
  piecesSummary,
  sidesFromNotation,
  validMaterialUids,
} from './optimizerForm'
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
import type { CSSProperties, ClipboardEvent, KeyboardEvent } from 'react'
import type { FillableField, PiecesEditor } from './usePiecesEditor'
import {
  cilArrowBottom,
  cilCloudDownload,
  cilCloudUpload,
  cilCopy,
  cilPlus,
  cilTrash,
} from '@coreui/icons'
import { useCallback, useEffect, useRef, useState } from 'react'

import CIcon from '@coreui/icons-react'
import type { EdgeSide } from './types'
import type { MaterialForm } from './optimizerForm'
import { parsePieces } from './piecesCsv'

interface PiecesTableProps {
  editor: PiecesEditor
  materials: MaterialForm[]
  boards: BoardProduct[]
  edgeBandings: EdgeBandingProduct[]
  onImportOpen: () => void
  onExport: () => void
}

const areaFmt = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })

// Fields that accept a pasted column of values to create rows.
const PASTEABLE_FIELDS = new Set(['height', 'width', 'quantity', 'priority', 'label'])

// data-col → field mapping. Cols 6 and 7 (banding sides and product) both propagate 'edgeBanding'.
const COL_FIELDS: FillableField[] = [
  'materialUid', // col 0
  'height',      // col 1
  'width',       // col 2
  'quantity',    // col 3
  'priority',    // col 4
  'label',       // col 5
  'edgeBandingSides',     // col 6 — banding sides only
  'edgeBandingProductId', // col 7 — banding product only
]

// Fill handle shown in the bottom-right corner of the active cell.
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

// Parses quick-entry format: "720x400", "720x400x4", "720x400x4 Label", "720x400x4 Label 1L2C".
// Separator: x, X, ×, *. Decimal: dot or comma.
// Edge notation (1L, 2L, 1C, 2C, 1L1C, 1L2C, 2L1C, 4L) goes LAST, after the label.
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

// SVG thumbnail: the piece is displayed rotated 90° clockwise, so
// long sides (L = left/right of the piece) appear as horizontal bars top/bottom,
// and short sides (C = top/bottom of the piece) appear as vertical bars left/right.
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
  // Cell showing the fill handle (follows focus, like Excel's "active cell").
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  // Active fill drag. `targetRow` is the row under the pointer (clamped to the list).
  const [drag, setDrag] = useState<{ srcRow: number; col: number; targetRow: number } | null>(null)

  // Programmatically focus a cell by position (data-row / data-col).
  const focusCell = useCallback((row: number, col: number) => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`,
    )
    el?.focus()
    if (el instanceof HTMLInputElement) el.select()
  }, [])

  // After adding a row, focus its first dimension input so the user can keep typing without touching the mouse.
  useEffect(() => {
    if (focusRow == null) return
    focusCell(focusRow, 1)
    clearFocus()
  }, [focusRow, focusCell, clearFocus])

  // Ctrl+Z / Cmd+Z: undoes the last structural operation (no-op when an input is focused).
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
  // No selection: fill-down/actions apply to all rows. With selection: only to marked rows.
  const fillScope = selected.size > 0 ? 'selected' : 'all'
  const hasSelection = selected.size > 0

  // Keyboard navigation in the pieces grid.
  // Col 0 = material (select), 1 = height, 2 = width, 3 = qty, 4 = priority, 5 = label,
  // 6 = banding sides (select), 7 = banding product (select).
  // ArrowUp/Down on select cols (0, 6, 7) are left to the browser.
  // ArrowLeft/Right on col 5 (text) only navigate when the cursor is at the string boundary.
  const LAST_COL = 7
  const SELECT_COLS = new Set([0, 6, 7])
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case 'Enter':
        if (SELECT_COLS.has(colIndex)) return // selects use Enter to open/close
        e.preventDefault()
        if (rowIndex === requirements.length - 1) add()
        else focusCell(rowIndex + 1, colIndex)
        break

      case 'ArrowDown':
        if (SELECT_COLS.has(colIndex)) return // select navigates its own options
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
          // Text input: only leave when the cursor is already at the end
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== inp.value.length) return
        }
        e.preventDefault()
        focusCell(rowIndex, colIndex + 1)
        break
      }

      case 'ArrowLeft': {
        if (colIndex === 5) {
          // Text input: only leave when the cursor is already at the start
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== 0) return
          e.preventDefault()
          focusCell(rowIndex, colIndex - 1)
          break
        }
        if (colIndex === 0) {
          // Select: go to the last field of the previous row
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

  // Table paste: overwrites from the active row and creates new rows as needed.
  // Multi-column (TSV) → pasteRows; single column → pasteIntoField.
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
        // Multi-column range copied from a spreadsheet → overwrite from startRow.
        e.preventDefault()
        const { rows } = parsePieces(text, materials, boards)
        if (rows.length) pasteRows(startRow, rows)
        return
      }

      // Single column: overwrite the active field in existing rows and create missing ones.
      if (!(active instanceof HTMLInputElement)) return
      const field = active.dataset.field as 'height' | 'width' | 'quantity' | 'priority' | 'label'
      if (!field || !PASTEABLE_FIELDS.has(field) || isNaN(rawRow)) return
      e.preventDefault()
      pasteIntoField(startRow, field, lines)
    },
    [materials, boards, pasteRows, pasteIntoField],
  )

  // Quick-entry field: "720×400×4 Label 1L2C" → adds a piece on Enter.
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

  // Row under the pointer's Y coordinate (clamped to the existing row range).
  const rowFromY = (y: number): number => {
    const rows = containerRef.current?.querySelectorAll('tbody tr')
    if (!rows || rows.length === 0) return 0
    for (let idx = 0; idx < rows.length; idx++) {
      if (y < rows[idx].getBoundingClientRect().bottom) return idx
    }
    return rows.length - 1
  }

  // Is cell (col, row i) within the active fill-drag range?
  const inFillRange = (col: number, i: number): boolean => {
    if (!drag || drag.col !== col) return false
    return i >= Math.min(drag.srcRow, drag.targetRow) && i <= Math.max(drag.srcRow, drag.targetRow)
  }

  // Editable cell style: relative position to anchor the fill handle + range highlight.
  const cellStyle = (col: number, i: number, minWidth: number): CSSProperties => ({
    minWidth,
    position: 'relative',
    ...(inFillRange(col, i) ? { boxShadow: 'inset 0 0 0 2px var(--cui-primary)' } : {}),
  })

  // Draggable fill handle in the active cell. Uses Pointer Events (mouse + touch) with pointer capture.
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

  // Render helper (not a component): "fill down" button in a column header.
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

        {/* Quick entry: "720×400×4 Label 1L2C" → adds a piece on Enter */}
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
