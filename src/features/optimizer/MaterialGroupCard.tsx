import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CBadge, CButton, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom, cilChevronRight, cilCopy, cilPlus, cilTrash } from '@coreui/icons'

import SearchableSelect from 'src/shared/components/SearchableSelect'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import type { MaterialSourceKind } from './types'
import type { MaterialForm, RequirementForm } from './optimizerForm'
import {
  CANTO_NOTATION_RE,
  SOURCE_LABELS,
  emptyRequirement,
  isRequirementEmpty,
  sidesFromNotation,
} from './optimizerForm'
import type { PiecesEditor } from './usePiecesEditor'
import PieceRowsTable from './PieceRowsTable'

const SOURCES: MaterialSourceKind[] = ['catalog', 'companyOffcut', 'clientOffcut']

interface MaterialGroupCardProps {
  material: MaterialForm
  rows: RequirementForm[]
  startIndex: number
  materialValid: boolean
  collapsed: boolean
  editor: PiecesEditor
  boards: BoardProduct[]
  edgeBandings: EdgeBandingProduct[]
  materials: MaterialForm[]
  onToggle: () => void
  onUpdate: <K extends keyof MaterialForm>(uid: string, field: K, value: MaterialForm[K]) => void
  onRequestDelete: (m: MaterialForm) => void
  onDuplicate: (m: MaterialForm) => void
}

const boardDims = (b?: BoardProduct): string | null => {
  if (!b) return null
  const { height, width, thickness } = b.attributes
  if (!height || !width) return null
  return `${width}×${height}${thickness ? `×${thickness}` : ''} mm`
}

// Quick-entry format: "720x400", "720x400x4", "720x400x4 Label", "720x400x4 Label 1L2C".
// Separator: x, X, ×, *. Decimal: dot or comma. Edge notation goes LAST, after the label.
const QUICK_REGEX =
  /^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[xX×*]\s*(\d+(?:[.,]\d+)?))?(?:\s+(.+))?$/

const parseQuickEntry = (
  text: string,
): {
  height: number
  width: number
  quantity: number
  label: string
  notation: string | null
} | null => {
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

const MaterialGroupCard = ({
  material: m,
  rows,
  startIndex,
  materialValid,
  collapsed,
  editor,
  boards,
  edgeBandings,
  materials,
  onToggle,
  onUpdate,
  onRequestDelete,
  onDuplicate,
}: MaterialGroupCardProps) => {
  const [quickText, setQuickText] = useState('')
  const [quickError, setQuickError] = useState('')

  const invalidCount = rows.filter(
    (r) =>
      !(materialValid && Number(r.height) > 0 && Number(r.width) > 0) && !isRequirementEmpty(r),
  ).length

  const dims =
    m.source === 'catalog'
      ? boardDims(boards.find((b) => String(b.id) === String(m.boardId)))
      : null

  const handleQuickEntry = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (!quickText.trim()) return
    const parsed = parseQuickEntry(quickText)
    if (!parsed) {
      setQuickError('Formato: 720×400 o 720×400×4 Etiqueta 1L2C')
      return
    }
    const req = emptyRequirement(m.uid)
    req.height = parsed.height
    req.width = parsed.width
    req.quantity = parsed.quantity
    req.label = parsed.label
    if (parsed.notation) {
      const lastEb = rows[rows.length - 1]?.edgeBanding
      req.edgeBanding = {
        productId: lastEb?.productId ?? '',
        sides: sidesFromNotation(parsed.notation),
      }
    }
    editor.addMany([req], false)
    setQuickText('')
    setQuickError('')
  }

  return (
    <div className="border rounded mb-2">
      <div className="d-flex flex-wrap gap-2 align-items-end p-2 border-bottom bg-body-tertiary">
        <CButton
          size="sm"
          color="secondary"
          variant="ghost"
          type="button"
          className="px-1"
          title={collapsed ? 'Expandir piezas' : 'Plegar piezas'}
          onClick={onToggle}
        >
          <CIcon icon={collapsed ? cilChevronRight : cilChevronBottom} />
        </CButton>

        <div style={{ width: 150 }}>
          <CFormLabel className="small mb-1">Fuente</CFormLabel>
          <CFormSelect
            size="sm"
            value={m.source}
            onChange={(e) => onUpdate(m.uid, 'source', e.target.value as MaterialSourceKind)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </CFormSelect>
        </div>

        {m.source === 'catalog' ? (
          <div style={{ minWidth: 220, flex: '1 1 260px' }}>
            {/* Dims sit on the label line (not below the select) so the field keeps the same height
                as the others and all selects stay vertically aligned. */}
            <div className="d-flex justify-content-between align-items-baseline gap-2 mb-1">
              <CFormLabel className="small mb-0">Tablero</CFormLabel>
              {dims && <span className="small text-body-secondary text-nowrap">{dims}</span>}
            </div>
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
          </div>
        ) : (
          <>
            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <CFormLabel className="small mb-1">Etiqueta</CFormLabel>
              <CFormInput
                size="sm"
                value={m.label}
                placeholder="Retazo bodega 3"
                onChange={(e) => onUpdate(m.uid, 'label', e.target.value)}
              />
            </div>
            <div style={{ width: 80 }}>
              <CFormLabel className="small mb-1">Largo</CFormLabel>
              <CFormInput
                size="sm"
                type="number"
                min={1}
                value={m.height}
                onChange={(e) => onUpdate(m.uid, 'height', e.target.value)}
              />
            </div>
            <div style={{ width: 80 }}>
              <CFormLabel className="small mb-1">Ancho</CFormLabel>
              <CFormInput
                size="sm"
                type="number"
                min={1}
                value={m.width}
                onChange={(e) => onUpdate(m.uid, 'width', e.target.value)}
              />
            </div>
            <div style={{ width: 80 }}>
              <CFormLabel className="small mb-1">Grosor</CFormLabel>
              <CFormInput
                size="sm"
                type="number"
                min={1}
                value={m.thickness}
                onChange={(e) => onUpdate(m.uid, 'thickness', e.target.value)}
              />
            </div>
            <div style={{ width: 110 }}>
              <CFormLabel className="small mb-1">Costo unit.</CFormLabel>
              <CFormInput
                size="sm"
                type="number"
                min={0}
                step="0.01"
                value={m.costPerUnit}
                onChange={(e) => onUpdate(m.uid, 'costPerUnit', e.target.value)}
              />
            </div>
          </>
        )}

        <div className="ms-auto d-flex align-items-center gap-2">
          <span className="small text-body-secondary text-nowrap">
            <strong className="text-body">{rows.length}</strong> piezas
          </span>
          {invalidCount > 0 && (
            <CBadge color="danger" title="Piezas con datos incompletos">
              {invalidCount} incompletas
            </CBadge>
          )}
          <CButton
            size="sm"
            variant="ghost"
            color="secondary"
            type="button"
            title="Duplicar material y sus piezas"
            onClick={() => onDuplicate(m)}
          >
            <CIcon icon={cilCopy} />
          </CButton>
          <CButton
            size="sm"
            variant="ghost"
            color="danger"
            type="button"
            title="Eliminar material"
            onClick={() => onRequestDelete(m)}
          >
            <CIcon icon={cilTrash} />
          </CButton>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2">
          <PieceRowsTable
            materialUid={m.uid}
            rows={rows}
            startIndex={startIndex}
            materialValid={materialValid}
            editor={editor}
            edgeBandings={edgeBandings}
            materials={materials}
            boards={boards}
          />
          <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              type="button"
              onClick={() => editor.addTo(m.uid)}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Agregar pieza
            </CButton>
            <CFormInput
              size="sm"
              value={quickText}
              onChange={(e) => {
                setQuickText(e.target.value)
                setQuickError('')
              }}
              onKeyDown={handleQuickEntry}
              placeholder="720×400×4  Etiqueta  1L2C  (Enter para agregar)"
              invalid={!!quickError}
              style={{ maxWidth: 380 }}
            />
            {quickError && <small className="text-danger">{quickError}</small>}
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialGroupCard
