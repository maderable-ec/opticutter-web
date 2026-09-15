import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'

import SearchableSelect from 'src/shared/components/SearchableSelect'
import type { BoardProduct } from 'src/features/products/types'
import { subtypeLabel } from 'src/features/products/productSubtypes'
import type { MaterialForm, OffcutForm, OffcutSource } from './optimizerForm'
import { emptyOffcut } from './optimizerForm'
import type { ModalContainer, PoolFillOrder } from './types'

// Everything about WHERE a group's material comes from, in one place: the catalog
// board (optional), the retazos, and the order they are filled in.
//
// It is a modal and not a section of the card because this is stock configuration
// competing with the cut list for the same screen. The card used to inline it —
// up to 23 controls between the material's name and the piece table — and the
// exception ended up more prominent than the rule. Here the retazo rows also get
// the width they need: seven fields wrap badly inside a card.
//
// There is no "source" for the group. A board makes it a catalog quote, retazos
// alone make it a job on the client's own material, and both together are the
// mixed pool. Which retazo the API uses as the pool's anchor is decided by
// `buildPayload`; the seller never sees that word.

const FILL_ORDER_OPTIONS: { value: PoolFillOrder; label: string }[] = [
  { value: 'auto', label: 'Automático (menos desperdicio)' },
  { value: 'offcutsFirst', label: 'Retazo primero' },
  { value: 'catalogFirst', label: 'Tablero primero' },
]

const OFFCUT_SOURCES: { value: OffcutSource; label: string }[] = [
  { value: 'clientOffcut', label: 'Retazo cliente' },
  { value: 'companyOffcut', label: 'Retazo empresa' },
]

// The board subtypes present in the catalog, most common first — MDP is 134 of
// the 210 live boards, so frequency order puts the answer at the top without
// spending a column on counts. Derived from the boards actually loaded, so a
// catalog that grows a subtype needs no change here.
//
// The label goes through `subtypeLabel()`: the stored value is the backend's
// English enum, and an option reading "Grooved" is one a seller looking for
// Ranurado reports as MISSING — which is exactly how this was found.
const subtypeOptions = (boards: BoardProduct[]): { value: string; label: string }[] => {
  const counts = new Map<string, number>()
  for (const b of boards) {
    const raw = b.attributes.subtype
    if (raw === undefined || raw === null || raw === '') continue
    counts.set(String(raw), (counts.get(String(raw)) ?? 0) + 1)
  }
  return (
    [...counts.entries()]
      .map(([value, n]) => ({ value, label: subtypeLabel(value), n }))
      // Ties break on the LABEL, which is the order the reader can see: sorting the
      // English value puts "Ranurado" between nothing in particular.
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
      .map(({ value, label }) => ({ value, label }))
  )
}

// Retazo grid: one stable column index per field, so a cell is addressable by
// (row, col) the way `PieceRowsTable` addresses the piece grid. The Costo column
// is NOT rendered for a client's own offcut — see `focusCell`/`focusSibling`,
// which is where that hole is absorbed.
const OFFCUT_SELECT_COL = 0 // Tipo (a native select: the arrows are its own)
const OFFCUT_TEXT_COL = 1 // Etiqueta (the only free-text cell: the caret comes first)
const OFFCUT_LAST_COL = 6 // Cant.

interface MaterialModalProps {
  // Target group; the modal is visible while non-null.
  material: MaterialForm | null
  boards: BoardProduct[]
  onUpdate: (
    uid: string,
    field: keyof MaterialForm,
    value: MaterialForm[keyof MaterialForm],
  ) => void
  container?: ModalContainer
  onClose: () => void
}

const MaterialModal = ({ material, boards, onUpdate, container, onClose }: MaterialModalProps) => {
  const offcuts = material?.offcuts ?? []

  // Catalog filter. It lives here and not in the picker because this is where
  // there is room for it: the card's inline select still sits above the piece
  // table. SINGLE-valued, and a plain select: a seller filtering this picker is
  // choosing the one board they are about to assign, not scoping a report the
  // way /products does — a checklist cost a click to open and another to close
  // for what a select does in one.
  const [subtype, setSubtype] = useState('')

  const subtypeChoices = useMemo(() => subtypeOptions(boards), [boards])

  const filteredBoards = useMemo(
    () =>
      subtype === ''
        ? boards
        : boards.filter((b) => String(b.attributes.subtype ?? '') === subtype),
    [boards, subtype],
  )

  // A filter that hides the board already chosen would leave the picker showing a
  // name absent from its own list; keep it reachable.
  const boardId = material?.boardId ?? ''
  const pickerBoards = useMemo(() => {
    if (!boardId) return filteredBoards
    const chosen = boards.find((b) => String(b.id) === String(boardId))
    if (!chosen || filteredBoards.some((b) => b.id === chosen.id)) return filteredBoards
    return [chosen, ...filteredBoards]
  }, [boards, filteredBoards, boardId])

  const setOffcuts = (next: OffcutForm[]) => {
    if (material) onUpdate(material.uid, 'offcuts', next)
  }
  const updateOffcut = (uid: string, field: keyof OffcutForm, value: string) =>
    setOffcuts(offcuts.map((o) => (o.uid === uid ? { ...o, [field]: value } : o)))

  // --- Retazo grid keyboard navigation ---
  // Seven fields per row typed one after another is a grid, and the piece table
  // next door already walks with the arrows; without this the same person changes
  // language between the two panels and reaches for the mouse on every cell.
  const rowsRef = useRef<HTMLDivElement>(null)

  // The cells of one row, left to right. Read from the DOM rather than derived
  // from `offcuts` because that is where the hidden Costo column is already
  // resolved: a client's retazo has no price, so its row is one cell shorter.
  const cellsOf = (row: number): HTMLElement[] =>
    [...(rowsRef.current?.querySelectorAll<HTMLElement>(`[data-orow="${row}"]`) ?? [])].sort(
      (a, b) => Number(a.dataset.ocol) - Number(b.dataset.ocol),
    )

  const focusEl = (el?: HTMLElement) => {
    if (!el) return
    el.focus()
    // Valid on a number input; reading `selectionStart` there is not (Chrome
    // throws InvalidStateError), which is why only the text cell checks a caret.
    if (el instanceof HTMLInputElement) el.select()
  }

  // Vertical move: the same column in the target row, or the nearest one to its
  // left that exists there. Walking down the Costo column onto a client's retazo
  // lands on Grosor instead of stopping dead.
  const focusCell = (row: number, col: number) => {
    const cells = cellsOf(row)
    if (cells.length === 0) return
    const exact = cells.find((el) => Number(el.dataset.ocol) === col)
    const before = [...cells].reverse().find((el) => Number(el.dataset.ocol) < col)
    focusEl(exact ?? before ?? cells[0])
  }

  // Horizontal move by DOM neighbour, so a missing Costo column is simply not
  // there rather than a gap to jump. False ⇒ the row ended; the caller wraps.
  const focusSibling = (row: number, col: number, dir: 1 | -1): boolean => {
    const cells = cellsOf(row)
    const i = cells.findIndex((el) => Number(el.dataset.ocol) === col)
    const next = i === -1 ? undefined : cells[i + dir]
    if (!next) return false
    focusEl(next)
    return true
  }

  // Adding lands the caret on the new row's Etiqueta: today the focus stays on
  // the button and the first field has to be reached with the mouse.
  const addOffcut = () => {
    const row = offcuts.length
    setOffcuts([...offcuts, emptyOffcut()])
    requestAnimationFrame(() => focusCell(row, OFFCUT_TEXT_COL))
  }

  const handleOffcutKeyDown = (e: KeyboardEvent<HTMLElement>, row: number, col: number) => {
    const lastRow = offcuts.length - 1
    switch (e.key) {
      // Enter on the last row adds a retazo, as it adds a piece in the cut grid.
      case 'Enter':
        if (col === OFFCUT_SELECT_COL) return
        e.preventDefault()
        if (row === lastRow) addOffcut()
        else focusCell(row + 1, col)
        break

      // The number inputs lose their spinner to this, deliberately: the arrows
      // move between fields here, exactly as they do in the piece grid.
      case 'ArrowDown':
        if (col === OFFCUT_SELECT_COL) return
        e.preventDefault()
        if (row < lastRow) focusCell(row + 1, col)
        break

      case 'ArrowUp':
        if (col === OFFCUT_SELECT_COL) return
        e.preventDefault()
        if (row > 0) focusCell(row - 1, col)
        break

      case 'ArrowRight': {
        // Inside Etiqueta the caret comes first: the cell is only left from its end.
        if (col === OFFCUT_TEXT_COL) {
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== inp.value.length) return
        }
        e.preventDefault()
        if (!focusSibling(row, col, 1) && row < lastRow) focusCell(row + 1, 0)
        break
      }

      case 'ArrowLeft': {
        if (col === OFFCUT_TEXT_COL) {
          const inp = e.currentTarget as HTMLInputElement
          if (inp.selectionStart !== 0) return
        }
        e.preventDefault()
        if (!focusSibling(row, col, -1) && row > 0) focusCell(row - 1, OFFCUT_LAST_COL)
        break
      }
    }
  }

  return (
    <CModal
      visible={!!material}
      onClose={onClose}
      alignment="center"
      // xl and not lg: seven fields plus the trash button are ~800px, so at lg every
      // retazo row wrapped its delete button onto a line of its own — which is the
      // width this modal exists to give them in the first place.
      size="xl"
      container={container}
    >
      <CModalHeader>
        <CModalTitle>Material del grupo</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {material && (
          <>
            <CFormLabel className="small mb-1">Tablero de catálogo</CFormLabel>
            <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
              {/* The empty option is the way back to the whole catalog — with a
                  single-valued filter there is nothing else to clear. The width
                  is fixed because "Madera Natural" does not fit the select's own. */}
              <CFormSelect
                size="sm"
                style={{ width: 240 }}
                aria-label="Tipo de tablero"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {subtypeChoices.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </CFormSelect>
              {/* The aggregate, not a count per option: what the seller needs to
                  know is whether the filter actually cut the list. */}
              <span className="small text-body-secondary">
                {filteredBoards.length === boards.length
                  ? `${boards.length} tableros`
                  : `${filteredBoards.length} de ${boards.length}`}
              </span>
            </div>
            <div className="d-flex gap-2 align-items-start mb-1">
              <div className="flex-grow-1">
                <SearchableSelect
                  value={String(material.boardId)}
                  placeholder="Sin tablero"
                  searchPlaceholder="Buscar por nombre o código…"
                  emptyText="Sin tableros que coincidan"
                  options={pickerBoards.map((b) => ({
                    value: String(b.id),
                    label: b.name,
                    sublabel: b.code,
                  }))}
                  onChange={(v) => onUpdate(material.uid, 'boardId', v)}
                  container={container}
                />
              </div>
              {material.boardId && (
                <CButton
                  color="secondary"
                  variant="ghost"
                  type="button"
                  title="Quitar el tablero: las piezas se cortarán solo sobre los retazos"
                  onClick={() => onUpdate(material.uid, 'boardId', '')}
                >
                  Quitar
                </CButton>
              )}
            </div>
            <div className="small text-body-secondary mb-3">
              {material.boardId
                ? 'Las piezas se reparten entre este tablero y los retazos de abajo.'
                : 'Sin tablero, las piezas se cortan solo sobre los retazos. Si no entran todas, el optimizador dice cuáles quedan fuera.'}
            </div>

            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span className="fw-semibold">Retazos</span>
              <span className="small text-body-secondary">del mismo material</span>
              {/* Board-vs-retazo priority only means something when there IS a
                  board: a group of retazos alone has nothing to order. */}
              {material.boardId && offcuts.length > 0 && (
                <>
                  <CFormLabel className="small mb-0 ms-auto text-nowrap">
                    Orden de llenado
                  </CFormLabel>
                  <CFormSelect
                    size="sm"
                    style={{ width: 230 }}
                    value={material.fillOrder ?? 'auto'}
                    onChange={(e) => onUpdate(material.uid, 'fillOrder', e.target.value)}
                  >
                    {FILL_ORDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                </>
              )}
            </div>

            {offcuts.length === 0 && (
              <p className="small text-body-secondary">
                Sin retazos. Agrega los que el cliente traiga o los que salgan de bodega, y el
                optimizador reparte las piezas de este grupo entre todos.
              </p>
            )}

            <div ref={rowsRef}>
              {offcuts.map((o, row) => (
                <div key={o.uid} className="d-flex flex-wrap gap-2 align-items-end mb-2">
                  <div style={{ width: 150 }}>
                    <CFormLabel className="small mb-1">Tipo</CFormLabel>
                    <CFormSelect
                      size="sm"
                      data-orow={row}
                      data-ocol={OFFCUT_SELECT_COL}
                      value={o.source}
                      onChange={(e) => updateOffcut(o.uid, 'source', e.target.value)}
                      onKeyDown={(e) => handleOffcutKeyDown(e, row, OFFCUT_SELECT_COL)}
                    >
                      {OFFCUT_SOURCES.map((src) => (
                        <option key={src.value} value={src.value}>
                          {src.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                  <div style={{ flex: '1 1 140px', minWidth: 120 }}>
                    <CFormLabel className="small mb-1">Etiqueta</CFormLabel>
                    <CFormInput
                      size="sm"
                      data-orow={row}
                      data-ocol={OFFCUT_TEXT_COL}
                      value={o.label}
                      placeholder="Retazo bodega 3"
                      onChange={(e) => updateOffcut(o.uid, 'label', e.target.value)}
                      onKeyDown={(e) => handleOffcutKeyDown(e, row, OFFCUT_TEXT_COL)}
                    />
                  </div>
                  <div style={{ width: 84 }}>
                    <CFormLabel className="small mb-1">Largo</CFormLabel>
                    <CFormInput
                      size="sm"
                      type="number"
                      min={1}
                      data-orow={row}
                      data-ocol={2}
                      value={o.height}
                      onChange={(e) => updateOffcut(o.uid, 'height', e.target.value)}
                      onKeyDown={(e) => handleOffcutKeyDown(e, row, 2)}
                    />
                  </div>
                  <div style={{ width: 84 }}>
                    <CFormLabel className="small mb-1">Ancho</CFormLabel>
                    <CFormInput
                      size="sm"
                      type="number"
                      min={1}
                      data-orow={row}
                      data-ocol={3}
                      value={o.width}
                      onChange={(e) => updateOffcut(o.uid, 'width', e.target.value)}
                      onKeyDown={(e) => handleOffcutKeyDown(e, row, 3)}
                    />
                  </div>
                  <div style={{ width: 84 }}>
                    <CFormLabel className="small mb-1">Grosor</CFormLabel>
                    <CFormInput
                      size="sm"
                      type="number"
                      min={1}
                      data-orow={row}
                      data-ocol={4}
                      value={o.thickness}
                      onChange={(e) => updateOffcut(o.uid, 'thickness', e.target.value)}
                      onKeyDown={(e) => handleOffcutKeyDown(e, row, 4)}
                    />
                  </div>
                  {/* The client's own material has no price: the shop charges the
                      cutting and the banding as additional services. The column is
                      therefore missing on those rows — see `focusSibling`. The gap
                      is still reserved: now that the arrows walk columns, two rows
                      whose fields do not line up read as the caret jumping
                      sideways. Reserved empty and unlabelled, so nothing invites
                      a price where there is none. */}
                  {o.source !== 'clientOffcut' ? (
                    <div style={{ width: 96 }}>
                      <CFormLabel className="small mb-1">Costo</CFormLabel>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        step="0.01"
                        data-orow={row}
                        data-ocol={5}
                        value={o.costPerUnit}
                        onChange={(e) => updateOffcut(o.uid, 'costPerUnit', e.target.value)}
                        onKeyDown={(e) => handleOffcutKeyDown(e, row, 5)}
                      />
                    </div>
                  ) : (
                    <div style={{ width: 96 }} aria-hidden="true" />
                  )}
                  <div style={{ width: 74 }}>
                    <CFormLabel className="small mb-1">Cant.</CFormLabel>
                    <CFormInput
                      size="sm"
                      type="number"
                      min={1}
                      data-orow={row}
                      data-ocol={OFFCUT_LAST_COL}
                      value={o.quantity}
                      onChange={(e) => updateOffcut(o.uid, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleOffcutKeyDown(e, row, OFFCUT_LAST_COL)}
                    />
                  </div>
                  <CButton
                    size="sm"
                    variant="ghost"
                    color="danger"
                    type="button"
                    title="Quitar retazo"
                    onClick={() => setOffcuts(offcuts.filter((x) => x.uid !== o.uid))}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </div>
              ))}
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                type="button"
                onClick={addOffcut}
              >
                <CIcon icon={cilPlus} className="me-1" />
                Agregar retazo
              </CButton>
              {offcuts.length > 0 && (
                <span className="small text-body-secondary">
                  Flechas para moverte entre campos · Enter en la última fila agrega otro retazo
                </span>
              )}
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        {/* No "save": every edit already wrote through `onUpdate`, the same way
            the inline fields did. A Cancelar here would have to undo them. */}
        <CButton color="primary" type="button" onClick={onClose}>
          Listo
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default MaterialModal
