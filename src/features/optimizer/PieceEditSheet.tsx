import { useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CAlert,
  CButton,
  CButtonGroup,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import BottomSheet from 'src/shared/components/BottomSheet'
import CantoPreview from 'src/shared/components/CantoPreview'
import SearchableSelect from 'src/shared/components/SearchableSelect'
import { workshopCodesLine } from 'src/shared/utils/workshopCodes'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import type { MaterialForm, RequirementForm } from './optimizerForm'
import {
  BAND_TYPES,
  displayedBandType,
  materialLabel,
  needsBandingProduct,
  notationFromSides,
  requirementIssues,
} from './optimizerForm'
import {
  bandingLookup,
  cantoOptions,
  pieceCutSize,
  tapacantoOptions,
  withBandTypeToggle,
  withBandingProduct,
  withCanto,
} from './pieceFields'
import { cantoLimit, specialEdgeTags, specialSidesOf } from './specialEdges'
import type { ModalContainer } from './types'
import type { PiecesEditor } from './usePiecesEditor'
import { useBoardEdgeBandings } from './useOptimizer'
import EdgeBandingPickerModal from './EdgeBandingPickerModal'

// One piece of the despiece, corrected on a phone. The grid has thirteen columns and a laptop is
// where a long despiece gets typed; on a phone the seller reads the list and fixes what the client
// changed — a measure, the quantity, the canto. So this edits the basic fields and SHOWS the rest:
// the cantos especiales and the workshop codes are typed in a notation that wants a keyboard, and
// both stay read-only here with a word saying where they are edited.
//
// Every change goes straight through `usePiecesEditor.update`, the same as a keystroke in the grid
// — there is no draft and no "Guardar" — and the canto controls run the grid's own rules
// (`pieceFields`), so the same taps inherit the same tapacanto on either screen.

interface PieceEditSheetProps {
  // Flat index of the piece; null closes the sheet.
  index: number | null
  editor: PiecesEditor
  materials: MaterialForm[]
  boards: BoardProduct[]
  edgeBandings: EdgeBandingProduct[]
  container?: ModalContainer
  onClose: () => void
}

const PieceEditSheet = ({
  index,
  editor,
  materials,
  boards,
  edgeBandings,
  container,
  onClose,
}: PieceEditSheetProps) => {
  const live = index != null ? editor.requirements[index] : undefined

  // What the sheet shows while it slides away. Closing drops `index` at once, and "Eliminar" drops
  // the piece itself — without this the sheet would go down empty, or showing the piece that moved
  // up into the deleted one's place. Kept by adjusting state during render (React's pattern for
  // "remember the previous prop"), which converges: once stored, the condition is false.
  const [shown, setShown] = useState<{ index: number; req: RequirementForm } | null>(null)
  if (live && index != null && (shown?.req !== live || shown.index !== index)) {
    setShown({ index, req: live })
  }
  const req = live ?? shown?.req
  const flat = index ?? shown?.index ?? 0

  const material = req ? materials.find((m) => m.uid === req.materialUid) : undefined
  const boardId = material?.boardId ? String(material.boardId) : undefined
  const board = boardId ? boards.find((b) => String(b.id) === boardId) : undefined
  // The board's coordinated tapes. Already cached by the group card that lists this piece.
  const { data: boardEdgeBandings = [] } = useBoardEdgeBandings(boardId)
  const byId = useMemo(
    () => bandingLookup(boardEdgeBandings, edgeBandings),
    [boardEdgeBandings, edgeBandings],
  )

  const [pickerOpen, setPickerOpen] = useState(false)
  const ids = { height: useId(), width: useId(), quantity: useId(), label: useId(), canto: useId() }

  // Enter walks the fields the way the grid's rows do, and the last one puts the keyboard away.
  const fieldRefs = useRef<(HTMLInputElement | null)[]>([])
  const onEnter = (k: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const next = fieldRefs.current[k + 1]
    if (next) next.focus()
    else e.currentTarget.blur()
  }

  if (!req) {
    return (
      <BottomSheet visible={false} onClose={onClose} title="Pieza">
        {null}
      </BottomSheet>
    )
  }

  const update = <K extends keyof RequirementForm>(field: K, value: RequirementForm[K]) =>
    editor.update(flat, field, value)

  const notation = notationFromSides(req.edgeBanding.sides)
  const bandType = displayedBandType(req.edgeBanding, byId)
  const banded = notation !== '—'
  const bandingMissing = needsBandingProduct(req)
  const issue = requirementIssues([req], materials)[0]
  const specialTags = specialEdgeTags(req.specialEdges ?? [], byId)
  const codes = workshopCodesLine(req)
  // The seller types the final size; a hard tape cuts it short, said under the measure it shortens.
  // Short, in the shop's own CD: the measures share one row of three narrow columns on a phone.
  const cut = pieceCutSize(req, byId)
  const cutLine = (off: number, size: number) =>
    off > 0 ? (
      <div className="form-text mt-1 text-tech">
        ✂ Corte {size} mm (−{off} por CD)
      </div>
    ) : null

  return (
    <BottomSheet
      visible={index != null}
      onClose={onClose}
      className="piece-sheet"
      title={
        <>
          Pieza #{flat + 1}
          {req.label.trim() && <span className="fw-normal"> · {req.label.trim()}</span>}
        </>
      }
      subtitle={material ? materialLabel(material, boards) : undefined}
      footer={
        <>
          <CButton
            color="secondary"
            variant="outline"
            type="button"
            onClick={() => editor.duplicate(flat)}
          >
            <Icon name="copy" className="me-1" />
            Duplicar
          </CButton>
          <CButton
            color="danger"
            variant="outline"
            type="button"
            onClick={() => {
              onClose()
              editor.remove(flat)
            }}
          >
            <Icon name="delete" className="me-1" />
            Eliminar
          </CButton>
          <CButton color="primary" type="button" className="ms-auto" onClick={onClose}>
            Listo
          </CButton>
        </>
      }
    >
      {issue && (
        <CAlert color="danger" className="py-2 small">
          Pieza incompleta: {issue.reasons.join(', ')}.
        </CAlert>
      )}

      <div className="piece-sheet__measures">
        <div>
          <CFormLabel htmlFor={ids.height}>Largo (mm)</CFormLabel>
          <CFormInput
            id={ids.height}
            ref={(el) => {
              fieldRefs.current[0] = el
            }}
            type="number"
            min={1}
            inputMode="decimal"
            enterKeyHint="next"
            value={req.height}
            onChange={(e) => update('height', e.target.value)}
            onKeyDown={onEnter(0)}
          />
          {cut && cutLine(cut.heightOff, cut.height)}
        </div>
        <div>
          <CFormLabel htmlFor={ids.width}>Ancho (mm)</CFormLabel>
          <CFormInput
            id={ids.width}
            ref={(el) => {
              fieldRefs.current[1] = el
            }}
            type="number"
            min={1}
            inputMode="decimal"
            enterKeyHint="next"
            value={req.width}
            onChange={(e) => update('width', e.target.value)}
            onKeyDown={onEnter(1)}
          />
          {cut && cutLine(cut.widthOff, cut.width)}
        </div>
        <div>
          <CFormLabel htmlFor={ids.quantity}>Cant.</CFormLabel>
          <CFormInput
            id={ids.quantity}
            ref={(el) => {
              fieldRefs.current[2] = el
            }}
            type="number"
            min={0}
            max={10000}
            inputMode="numeric"
            enterKeyHint="next"
            value={req.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            onKeyDown={onEnter(2)}
          />
        </div>
      </div>

      <CFormLabel htmlFor={ids.label} className="mt-3">
        Etiqueta
      </CFormLabel>
      <CFormInput
        id={ids.label}
        ref={(el) => {
          fieldRefs.current[3] = el
        }}
        enterKeyHint="done"
        placeholder="Puerta izq."
        value={req.label}
        onChange={(e) => update('label', e.target.value)}
        onKeyDown={onEnter(3)}
      />

      <CFormSwitch
        className="mt-3"
        id={`piece-rotate-${flat}`}
        label="Rotar: la pieza puede girarse al acomodarla en el tablero"
        checked={req.canRotate}
        onChange={(e) => update('canRotate', e.target.checked)}
      />

      <CFormLabel htmlFor={ids.canto} className="mt-3">
        Canto
      </CFormLabel>
      <div className="d-flex align-items-center gap-2">
        <CantoPreview
          sides={req.edgeBanding.sides}
          special={specialSidesOf(req.specialEdges ?? [])}
        />
        <CFormSelect
          id={ids.canto}
          className="flex-grow-1"
          style={{ minWidth: 0 }}
          value={notation}
          onChange={(e) => {
            const next = withCanto(req, e.target.value, boardEdgeBandings)
            if (!next) return
            update('edgeBanding', next.edgeBanding)
            update('specialEdges', next.specialEdges)
          }}
        >
          {cantoOptions(req, 'Sin canto').map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </CFormSelect>
        {/* The grid's three-state CS/CD pair: pressing the type on screen returns to unstated. */}
        <CButtonGroup role="group" aria-label="Tipo de canto">
          {BAND_TYPES.map((bt) => {
            const active = bt.value === bandType
            return (
              <CButton
                key={bt.value}
                type="button"
                color="primary"
                variant={active ? undefined : 'outline'}
                active={active}
                aria-pressed={active}
                disabled={!banded}
                aria-label={`Canto ${bt.label.toLowerCase()}`}
                onClick={() =>
                  update(
                    'edgeBanding',
                    withBandTypeToggle(req.edgeBanding, bt.value, bandType, boardEdgeBandings),
                  )
                }
              >
                {bt.abbr}
              </CButton>
            )
          })}
        </CButtonGroup>
      </div>

      {/* The special edges are read-only here, so the way to free a side is said in words. */}
      {cantoLimit(req.specialEdges ?? []) && (
        <div className="form-text mt-1">
          {cantoLimit(req.specialEdges ?? [])}. Para subir el Canto, quita el canto especial en la
          computadora.
        </div>
      )}

      <CFormLabel className="mt-3">Tapacanto</CFormLabel>
      <SearchableSelect
        value={String(req.edgeBanding.productId)}
        disabled={!banded}
        placeholder={bandingMissing ? '⚠ Falta tapacanto' : banded ? '—' : 'Sin canto'}
        searchPlaceholder="Buscar tapacanto…"
        emptyText="Sin tapacantos que coincidan"
        options={tapacantoOptions(req.edgeBanding, bandType, boardEdgeBandings, edgeBandings, byId)}
        onChange={(v) => update('edgeBanding', withBandingProduct(req.edgeBanding, v, byId))}
        footerLabel="Seleccionar otro…"
        onFooterClick={() => setPickerOpen(true)}
        container={container}
      />
      {bandingMissing && (
        <div className="small text-danger mt-1">
          Elige el tapacanto: sin él la pieza no se puede cotizar.
        </div>
      )}

      {/* Read-only on purpose: both are typed in a notation («1L CS BLN», «B2») that the grid's
          keyboard is built for. Said in words, so nobody hunts the phone for the missing input. */}
      <div className="piece-sheet__readonly mt-3">
        <div className="d-flex flex-wrap align-items-baseline gap-2">
          <span className="eyebrow">Cantos especiales</span>
          {specialTags.length ? (
            specialTags.map((t) => (
              <span key={t.productId} className="badge status-pill status-pill--neutral">
                {t.label}
              </span>
            ))
          ) : (
            <span className="small text-body-secondary">Ninguno</span>
          )}
        </div>
        <div className="d-flex flex-wrap align-items-baseline gap-2 mt-2">
          <span className="eyebrow">Códigos de taller</span>
          <span className={`small${codes ? '' : ' text-body-secondary'}`}>
            {codes || 'Ninguno'}
          </span>
        </div>
        <div className="form-text mt-2">
          Los cantos especiales y los códigos de taller se editan en la computadora.
        </div>
      </div>

      {pickerOpen && (
        <EdgeBandingPickerModal
          visible
          products={edgeBandings}
          value={String(req.edgeBanding.productId)}
          boardThickness={board?.attributes.thickness}
          pieceLabel={req.label.trim() || `Pieza ${flat + 1}`}
          container={container}
          onSelect={(p) => {
            update('edgeBanding', withBandingProduct(req.edgeBanding, String(p.id), byId))
            setPickerOpen(false)
          }}
          onClear={() => {
            update('edgeBanding', withBandingProduct(req.edgeBanding, '', byId))
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </BottomSheet>
  )
}

export default PieceEditSheet
