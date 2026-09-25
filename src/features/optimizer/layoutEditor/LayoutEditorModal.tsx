import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'

import { track } from 'src/shared/analytics'
import SheetSvg from 'src/shared/components/SheetSvg'
import { adjustmentLine } from '../CutLayoutDiagram'
import { fmtMoney } from 'src/features/review/format'
import { PALETTE, pieceLabel, pieceSig, remainderLabel } from 'src/shared/utils/cutDrawing'
import type { DrawableLayout } from 'src/shared/utils/cutDrawing'
import type {
  AdjustedSheet,
  EditablePiece,
  LayoutAdjustment,
  ModalContainer,
  OptimizePayload,
  PlacedPiece,
  SheetBinInfo,
} from '../types'
import EditorOverlay from './EditorOverlay'
import PieceToolbar from './PieceToolbar'
import { DIRECTION_LABELS } from './directions'
import { useLayoutEditor } from './useLayoutEditor'
import type { EditorFocus } from './useLayoutEditor'

// The layout editor: the seller rearranges the optimizer's plan by hand, sheet by sheet.
//
// Everything valid comes from the server. Picking a piece up asks where it fits (green zones and
// snap points), dropping it re-evaluates the whole plan, and only an answer the server accepted
// becomes the working state — so what is on screen is always a plan the backend would cut. The
// cuts themselves are never edited: they follow from where the pieces are, and the one thing the
// pieces cannot say — "keep this offcut whole" — is done on the offcut itself.

interface LayoutEditorModalProps {
  // The quote as it stands, without adjustments.
  request: OptimizePayload
  initial: LayoutAdjustment[] | null | undefined
  onApply: (adjustments: LayoutAdjustment[] | null) => void
  onClose: () => void
  // The sheet to open on: the one the diagram was showing.
  focus?: EditorFocus | null
  container?: ModalContainer
}

// Largo first (the height, the first measure everything here is entered with), like the cut list.
const dims = (item: { width: number; height: number }) =>
  `${Math.round(item.height)}×${Math.round(item.width)}`

const nameOf = (piece: EditablePiece | undefined, pieceId: string) => {
  const label = pieceLabel(pieceId)
  if (label) return label
  return piece ? dims(piece) : pieceId
}

const sheetKind = (bin: SheetBinInfo | undefined, sheet: AdjustedSheet | undefined) => {
  if (!sheet) return ''
  if (!bin) return sheet.materialKey
  if (bin.remaining !== null) return `Retazo ${dims(bin)}`
  return sheet.halfBoard ? 'Medio tablero' : 'Tablero entero'
}

// One colour per measurement for the whole session, assigned in cut-list order. The diagram's own
// `usePieceColors` assigns them in order of appearance on the sheets, which is exactly what an edit
// reshuffles: every move would repaint the pieces, and "what changed" would read as "everything".
const useStableColors = (pools: { pieces: EditablePiece[] }[]) =>
  useMemo(() => {
    const colors = new Map<string, string>()
    for (const pool of pools) {
      for (const p of pool.pieces) {
        const sig = pieceSig({ originalWidth: p.width, originalHeight: p.height })
        if (!colors.has(sig)) colors.set(sig, PALETTE[colors.size % PALETTE.length] ?? PALETTE[0])
      }
    }
    return (sig: string) => colors.get(sig) ?? PALETTE[0]
  }, [pools])

const LayoutEditorModal = ({
  request,
  initial,
  onApply,
  onClose,
  focus,
  container,
}: LayoutEditorModalProps) => {
  const editor = useLayoutEditor({ request, initial, focus })
  const {
    evaluation,
    pools,
    pool,
    sheets,
    sheet,
    sheetIndex,
    hand,
    fits,
    fitSummary,
    leftover,
    conversions,
  } = editor
  const [status, setStatus] = useState<string | null>(null)
  const [previewDirection, setPreviewDirection] = useState<number | null>(null)
  const colorFor = useStableColors(pools)
  // Clicking a piece SELECTS it (the toolbar beside it lists what can be done); dragging it MOVES
  // it. The two used to be one gesture — a click picked the piece up — so the actions were only
  // visible once the piece was already in hand, with nowhere obvious to put it back.
  const [selected, setSelected] = useState<string | null>(null)
  // A drag in progress (from its start point); the overlay follows it from there.
  const [drag, setDrag] = useState<{ clientX: number; clientY: number } | null>(null)
  // A one-off explanation under the sheet, such as why a drop was undone.
  const [flash, setFlash] = useState<string | null>(null)
  const sheetHostRef = useRef<HTMLDivElement>(null)

  const pieces = useMemo(() => new Map((pool?.pieces ?? []).map((p) => [p.pieceId, p])), [pool])
  const handPiece = hand ? pieces.get(hand.pieceId) : undefined
  const bin = editor.binOf(sheet)
  const layout = sheet ? (pool?.sheets[sheetIndex]?.layout ?? null) : null
  const drawable: DrawableLayout<PlacedPiece> | null = layout
    ? layout
    : bin
      ? { material: { width: bin.width, height: bin.height }, placedPieces: [], remainders: [] }
      : null
  const origin =
    hand && hand.fromSheet === sheetIndex
      ? (layout?.placedPieces.find((p) => p.pieceId === hand.pieceId) ?? null)
      : null
  // Only a piece that is on the sheet on screen, and never while one is in hand.
  const selectedPiece =
    !hand && selected && sheet?.pieces.some((p) => p.pieceId === selected) ? selected : null
  const activeDrag = hand ? drag : null

  const goToSheet = (index: number) => {
    setSelected(null)
    setFlash(null)
    editor.selectSheet(index)
  }

  // A press on a piece is a click or the start of a drag, decided by how far the pointer travels
  // before it is released. Window listeners, so the gesture survives leaving the piece.
  const handlePiecePointerDown = (p: PlacedPiece, e: ReactPointerEvent<SVGGElement>) => {
    if (hand || editor.busy || e.button !== 0) return
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY }
    const pieceId = p.pieceId
    const from = sheetIndex
    const stop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    const onMove = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return
      stop()
      setSelected(null)
      setFlash(null)
      editor.pickUp(pieceId, from)
      setDrag({ clientX: ev.clientX, clientY: ev.clientY })
    }
    const onUp = () => {
      stop()
      setFlash(null)
      if (leftover) editor.cancel()
      setSelected((s) => (s === pieceId ? null : pieceId))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const rotateSelected = async () => {
    if (!selectedPiece) return
    const inPlace = await editor.rotatePiece(selectedPiece)
    // Turned where it was: it stays selected. Otherwise it is now in hand, turned, with the spots
    // where it fits on show.
    if (!inPlace) setSelected(null)
  }

  const closeWithConfirm = () => {
    if (editor.dirty && !window.confirm('¿Descartar los ajustes que no aplicaste?')) return
    track('layout_editor_cancelled', { dirty: editor.dirty })
    onClose()
  }

  const apply = () => {
    const adjustments = editor.result()
    track('layout_editor_applied', { pools: adjustments?.length ?? 0 })
    onApply(adjustments)
  }

  // Keys: R turns the piece in hand, Esc lets go of it (and only then closes), Supr sends it to the
  // pending tray, Ctrl+Z / Ctrl+Y walk the history. Windows notation in the hints, `metaKey`
  // accepted, like every shortcut in the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (editor.canUndo) void editor.undo()
      } else if (
        mod &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        if (editor.canRedo) void editor.redo()
      } else if (e.key === 'Escape') {
        // An open menu owns its Escape: closing it must not also drop the piece or the editor.
        if (document.querySelector('.modal.show .dropdown-menu.show')) return
        e.preventDefault()
        if (hand || leftover) {
          setDrag(null)
          editor.cancel()
        } else if (selectedPiece) setSelected(null)
        else closeWithConfirm()
      } else if (!mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        // Paging between sheets, like the diagram viewer. A piece in hand travels along, so this is
        // also how it is carried to another sheet.
        if (document.querySelector('.modal.show .dropdown-menu.show')) return
        const next = sheetIndex + (e.key === 'ArrowRight' ? 1 : -1)
        if (next < 0 || next >= sheets.length || editor.busy) return
        e.preventDefault()
        goToSheet(next)
      } else if (!mod && e.key.toLowerCase() === 'r') {
        if (hand && handPiece?.canRotate) editor.rotateHand()
        else if (selectedPiece && pieces.get(selectedPiece)?.canRotate && !editor.busy)
          void rotateSelected()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = hand && hand.fromSheet !== null ? hand.pieceId : selectedPiece
        if (!target || editor.busy) return
        e.preventDefault()
        setDrag(null)
        setSelected(null)
        void editor.sendToPending(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const summary = evaluation?.adjustmentSummary
  const summaryLine = summary ? adjustmentLine(summary) : ''
  const pending = pool?.pending ?? []
  const addable = (pool?.bins ?? []).filter((b) => b.remaining === null || b.remaining > 0)
  const fitsBySheet = new Map((fitSummary ?? []).map((f) => [f.sheetIndex, f]))
  const extensions = leftover?.extensions ?? null
  const previewRect =
    previewDirection !== null && extensions ? (extensions[previewDirection] ?? null) : null
  const keptWholeHere = leftover?.rect.keptWhole ?? false

  // The fixed help under the sheet: always what can be done right now, shortcuts included.
  const selectedName = selectedPiece ? nameOf(pieces.get(selectedPiece), selectedPiece) : ''
  const hint = editor.busy
    ? 'Evaluando…'
    : activeDrag
      ? (status ?? 'Suelta donde esté en verde; fuera de las zonas verdes vuelve a su lugar.')
      : hand
        ? (status ??
          `Elige dónde soltarla: las zonas verdes muestran dónde entra. Clic para soltar${
            handPiece?.canRotate ? ' · R la gira' : ''
          } · ← → otra hoja · Esc cancela.`)
        : (flash ??
          (selectedPiece
            ? `«${selectedName}»: usa la barra junto a la pieza o arrástrala.${
                pieces.get(selectedPiece)?.canRotate ? ' R la gira ·' : ' Veta fija: no gira ·'
              } Supr la quita · Esc la deselecciona.`
            : 'Arrastra una pieza para moverla · clic en una pieza o en un retazo para ver sus opciones · ← → cambian de hoja.'))

  return (
    <CModal
      visible
      fullscreen
      scrollable
      keyboard={false}
      backdrop="static"
      onClose={closeWithConfirm}
      container={container}
    >
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2 flex-wrap">
          <span>Ajustar distribución</span>
          {pools.length > 1 && (
            <span className="d-flex gap-1 flex-wrap">
              {pools.map((p) => (
                <CButton
                  key={p.poolKey}
                  size="sm"
                  color="secondary"
                  variant={p.poolKey === pool?.poolKey ? undefined : 'outline'}
                  onClick={() => editor.selectPool(p.poolKey)}
                  disabled={editor.busy}
                >
                  {p.label}
                  {p.adjusted && <span className="ms-1">•</span>}
                </CButton>
              ))}
            </span>
          )}
          {pools.length === 1 && pool && (
            <span className="text-body-secondary fs-6">{pool.label}</span>
          )}
        </CModalTitle>
      </CModalHeader>

      <CModalBody style={{ scrollbarGutter: 'stable' }}>
        {!evaluation && (
          <div className="d-flex align-items-center gap-2 text-body-secondary">
            <CSpinner size="sm" /> Cargando la distribución…
          </div>
        )}

        {evaluation && pool && (
          <CRow className="g-3">
            <CCol xs={12} lg={8} xxl={9} className="align-self-start">
              {/* The sheet on screen: what it is, how full, and what size it can take. */}
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="ghost"
                  disabled={sheetIndex === 0 || editor.busy}
                  onClick={() => goToSheet(sheetIndex - 1)}
                  aria-label="Hoja anterior"
                  title="Hoja anterior (←)"
                >
                  ‹
                </CButton>
                <strong>
                  Hoja {sheetIndex + 1} de {sheets.length}
                </strong>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="ghost"
                  disabled={sheetIndex >= sheets.length - 1 || editor.busy}
                  onClick={() => goToSheet(sheetIndex + 1)}
                  aria-label="Hoja siguiente"
                  title="Hoja siguiente (→)"
                >
                  ›
                </CButton>
                <span className="text-body-secondary">· {sheetKind(bin, sheet)}</span>
                {layout ? (
                  <span className="text-body-secondary">
                    · {layout.statistics.efficiency.toFixed(1)}% aprovechada
                  </span>
                ) : (
                  <CBadge color="warning">Vacía: se elimina si no le pones piezas</CBadge>
                )}
                {layout?.adjusted && <CBadge color="info">Modificada</CBadge>}
                <CDropdown className="ms-auto" variant="btn-group">
                  <CDropdownToggle
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={editor.busy}
                  >
                    Tamaño de hoja
                  </CDropdownToggle>
                  <CDropdownMenu>
                    {conversions === null && <CDropdownItem disabled>Consultando…</CDropdownItem>}
                    {conversions?.map((c, i) => (
                      <CDropdownItem
                        key={i}
                        as="button"
                        onClick={() => void editor.convertSheet(c)}
                      >
                        {c.halfBoard
                          ? c.shiftX || c.shiftY
                            ? 'Convertir a medio tablero (con la otra mitad)'
                            : 'Convertir a medio tablero'
                          : 'Convertir a tablero entero'}
                      </CDropdownItem>
                    ))}
                    {conversions?.length === 0 && (
                      <CDropdownItem disabled>
                        {sheet?.halfBoard
                          ? 'Las piezas no caben en el tablero entero'
                          : bin?.remaining !== null
                            ? 'Un retazo no cambia de tamaño'
                            : 'Las piezas no caben en medio tablero'}
                      </CDropdownItem>
                    )}
                  </CDropdownMenu>
                </CDropdown>
              </div>

              {drawable && (
                <div ref={sheetHostRef} style={{ position: 'relative' }}>
                  <SheetSvg
                    key={`${pool.poolKey}-${sheetIndex}`}
                    layout={drawable}
                    colorFor={colorFor}
                    markAdjusted
                    onPiecePointerDown={hand ? undefined : handlePiecePointerDown}
                    selectedId={selectedPiece}
                    titleFor={(p) => {
                      const piece = pieces.get(p.pieceId)
                      return `${nameOf(piece, p.pieceId)}${piece ? ` ${dims(piece)}` : ''} · arrástrala para moverla · clic para ver opciones`
                    }}
                    onBackgroundTap={() => {
                      setSelected(null)
                      setFlash(null)
                    }}
                    onRemainderTap={
                      hand
                        ? undefined
                        : (r, i) => {
                            setSelected(null)
                            setFlash(null)
                            void editor.selectLeftover(i, r)
                          }
                    }
                    selectedRemainder={leftover?.index ?? null}
                    maxHeight="calc(100dvh - 17rem)"
                    showDimensions
                    enableZoom
                    overlay={
                      <EditorOverlay
                        sheetWidth={drawable.material.width}
                        sheetHeight={drawable.material.height}
                        hand={
                          hand && handPiece
                            ? {
                                label: nameOf(handPiece, hand.pieceId),
                                width: hand.rotated ? handPiece.height : handPiece.width,
                                height: hand.rotated ? handPiece.width : handPiece.height,
                                rotated: hand.rotated,
                              }
                            : null
                        }
                        fits={fits}
                        origin={origin}
                        pieces={(layout?.placedPieces ?? []).filter(
                          (p) => p.pieceId !== hand?.pieceId,
                        )}
                        pieceName={(id) => nameOf(pieces.get(id), id)}
                        onPlace={(position) => {
                          setDrag(null)
                          setStatus(null)
                          void editor.place(position)
                        }}
                        onStatus={setStatus}
                        preview={previewRect}
                        drag={activeDrag}
                        onDragCancel={(reason) => {
                          setDrag(null)
                          setStatus(null)
                          editor.cancel()
                          setFlash(reason)
                        }}
                      />
                    }
                  />
                  {selectedPiece && (
                    <PieceToolbar
                      container={sheetHostRef}
                      pieceId={selectedPiece}
                      title={`${selectedName} ${dims(pieces.get(selectedPiece) ?? { width: 0, height: 0 })}`}
                      canRotate={!!pieces.get(selectedPiece)?.canRotate}
                      busy={editor.busy}
                      onMove={() => {
                        setSelected(null)
                        setDrag(null)
                        editor.pickUp(selectedPiece, sheetIndex)
                      }}
                      onRotate={() => void rotateSelected()}
                      onRemove={() => {
                        setSelected(null)
                        void editor.sendToPending(selectedPiece)
                      }}
                      onClose={() => setSelected(null)}
                    />
                  )}
                </div>
              )}
              <div className="small text-body-secondary mt-2" aria-live="polite">
                {hint}
              </div>
            </CCol>

            <CCol xs={12} lg={4} xxl={3}>
              {/* What changed against the optimizer's own plan. */}
              <div className="border rounded-3 p-2 mb-3 small">
                <div className="text-uppercase fw-semibold text-body-secondary mb-1">Cambios</div>
                <div className={summaryLine ? undefined : 'text-body-secondary'}>
                  {summaryLine || 'Sin cambios: es el plan del optimizador.'}
                </div>
              </div>

              {editor.notice && (
                <CAlert
                  color="info"
                  className="py-2 small"
                  dismissible
                  onClose={editor.dismissNotice}
                >
                  {editor.notice}
                </CAlert>
              )}

              {editor.error && (
                <CAlert
                  color="danger"
                  className="py-2 small"
                  dismissible
                  onClose={editor.dismissError}
                >
                  {editor.error}
                </CAlert>
              )}

              {hand && handPiece && (
                <div className="border rounded-3 p-2 mb-3">
                  <div className="fw-semibold">
                    {nameOf(handPiece, hand.pieceId)}{' '}
                    <span className="text-body-secondary fw-normal">
                      {dims(handPiece)}
                      {hand.rotated ? ' · girada' : ''}
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <CButton
                      size="sm"
                      color="secondary"
                      variant="outline"
                      onClick={editor.rotateHand}
                      disabled={!handPiece.canRotate}
                      title={
                        handPiece.canRotate
                          ? 'Girar 90° (R)'
                          : 'Veta fija: esta pieza no se puede girar'
                      }
                    >
                      Girar
                    </CButton>
                    {hand.fromSheet !== null && (
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => void editor.sendToPending(hand.pieceId)}
                        title="La deja en Pendientes para ubicarla después (Supr)"
                      >
                        Quitar de la hoja
                      </CButton>
                    )}
                    <CButton size="sm" color="secondary" variant="ghost" onClick={editor.cancel}>
                      Cancelar
                    </CButton>
                  </div>
                  {/* Said as soon as it is known, before any hovering: in hand and with nowhere
                      to go on this sheet is otherwise a silent dead end. */}
                  {fits && !fits.positions.some((p) => p.rotated === hand.rotated) && (
                    <div className="small text-warning-emphasis mt-2">
                      {hand.rotated ? 'Girada no' : 'No'} entra en esta hoja.{' '}
                      {(fitSummary ?? []).some(
                        (f) =>
                          f.sheetIndex !== sheetIndex && (hand.rotated ? f.fitsRotated : f.fits),
                      )
                        ? 'Pásala a una hoja marcada «entra» (← →)'
                        : 'Tampoco en otra hoja así'}
                      {handPiece.canRotate ? ', o gírala de nuevo (R).' : '.'}
                    </div>
                  )}
                  {!handPiece.canRotate && (
                    <div className="small text-body-secondary mt-2">
                      Veta fija: solo se ubica en su orientación.
                    </div>
                  )}
                </div>
              )}

              {leftover && (
                <div className="border rounded-3 p-2 mb-3">
                  <div className="fw-semibold">
                    {keptWholeHere ? 'Retazo entero' : 'Retazo'}{' '}
                    <span className="text-body-secondary fw-normal">
                      {remainderLabel(leftover.rect)} mm
                    </span>
                  </div>
                  {extensions === null ? (
                    <div className="small text-body-secondary mt-2">
                      <CSpinner size="sm" /> Buscando cómo agrandarlo…
                    </div>
                  ) : (
                    <>
                      <div className="small text-body-secondary mt-2">
                        {keptWholeHere
                          ? 'Sale entero: los cortes no lo dividen. Si ubicas una pieza encima, deja de salir entero.'
                          : extensions.length
                            ? 'Agrándalo para que salga entero, en una sola pieza: los cortes se reordenan y las piezas no se mueven.'
                            : 'No se puede agrandar sin cruzar una pieza.'}
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {extensions.map((ext, i) => (
                          <CButton
                            key={ext.direction}
                            size="sm"
                            color="info"
                            variant="outline"
                            onMouseEnter={() => setPreviewDirection(i)}
                            onMouseLeave={() => setPreviewDirection(null)}
                            onFocus={() => setPreviewDirection(i)}
                            onBlur={() => setPreviewDirection(null)}
                            onClick={() => {
                              setPreviewDirection(null)
                              void editor.keepWhole(ext, keptWholeHere ? leftover.rect : undefined)
                            }}
                            title={`${DIRECTION_LABELS[ext.direction].label}: ${remainderLabel(ext)} mm`}
                          >
                            {DIRECTION_LABELS[ext.direction].arrow} {remainderLabel(ext)}
                          </CButton>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {keptWholeHere ? (
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => void editor.allowCutting(leftover.rect)}
                      >
                        Permitir cortarlo
                      </CButton>
                    ) : (
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => void editor.keepWhole(leftover.rect)}
                        title="Que los cortes lo dejen siempre en una sola pieza"
                      >
                        Mantener entero
                      </CButton>
                    )}
                    <CButton size="sm" color="secondary" variant="ghost" onClick={editor.cancel}>
                      Cerrar
                    </CButton>
                  </div>
                  {/* What the seller who grows an offcut to make room needs to hear: the room is
                      already there — a piece in hand is offered every free spot, whatever cut
                      splits it today. */}
                  <div className="small text-body-secondary mt-2">
                    Para ubicar una pieza no hace falta agrandar retazos: tómala y verás todo el
                    espacio libre donde entra, aunque hoy lo dividan los cortes.
                  </div>
                </div>
              )}

              {/* Pieces off every sheet: where "Quitar" leaves them, where they are picked from. */}
              <div className="mb-3">
                <div className="text-uppercase small fw-semibold text-body-secondary mb-1">
                  Pendientes ({pending.length})
                </div>
                {pending.length === 0 ? (
                  <div className="small text-body-secondary">Todas las piezas están ubicadas.</div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {pending.map((id) => {
                      const p = pieces.get(id)
                      return (
                        <CButton
                          key={id}
                          size="sm"
                          color={hand?.pieceId === id ? 'primary' : 'secondary'}
                          variant={hand?.pieceId === id ? undefined : 'outline'}
                          className="text-start"
                          onClick={() => {
                            setSelected(null)
                            setDrag(null)
                            editor.pickUp(id, null)
                          }}
                          disabled={editor.busy}
                        >
                          {nameOf(p, id)} <span className="opacity-75">{p ? dims(p) : ''}</span>
                        </CButton>
                      )
                    })}
                  </div>
                )}
                {pool.finite && pending.length > 0 && (
                  <div className="small text-body-secondary mt-1">
                    Solo hay retazos: lo que no entra queda fuera del corte.
                  </div>
                )}
              </div>

              {/* Every sheet of the material; with a piece in hand, where it fits. */}
              <div>
                <div className="d-flex align-items-center mb-1">
                  <span className="text-uppercase small fw-semibold text-body-secondary">
                    Hojas
                  </span>
                  <CDropdown className="ms-auto" variant="btn-group">
                    <CDropdownToggle
                      size="sm"
                      color="secondary"
                      variant="ghost"
                      disabled={editor.busy || addable.length === 0}
                    >
                      Agregar hoja
                    </CDropdownToggle>
                    <CDropdownMenu>
                      {addable.map((b) => (
                        <CDropdownItem
                          key={`${b.materialKey}-${b.halfBoard}`}
                          as="button"
                          onClick={() => void editor.addSheet(b)}
                        >
                          {b.remaining !== null
                            ? `Retazo ${dims(b)} (${b.remaining} disponible${b.remaining === 1 ? '' : 's'})`
                            : b.halfBoard
                              ? `Medio tablero · ${fmtMoney(b.costPerUnit)}`
                              : `Tablero entero · ${fmtMoney(b.costPerUnit)}`}
                        </CDropdownItem>
                      ))}
                    </CDropdownMenu>
                  </CDropdown>
                </div>
                <div className="d-flex flex-column gap-1">
                  {sheets.map((s, i) => {
                    const fit = fitsBySheet.get(i)
                    const sheetBin = editor.binOf(s)
                    return (
                      <CButton
                        key={i}
                        size="sm"
                        color={i === sheetIndex ? 'primary' : 'secondary'}
                        variant={i === sheetIndex ? undefined : 'outline'}
                        className="text-start d-flex align-items-center gap-2"
                        onClick={() => goToSheet(i)}
                        disabled={editor.busy}
                      >
                        <span className="fw-semibold">{i + 1}</span>
                        <span className="flex-grow-1">
                          {sheetKind(sheetBin, s)}
                          {s.layout
                            ? ` · ${s.layout.statistics.efficiency.toFixed(0)}% · ${s.pieces.length} pz`
                            : ' · vacía'}
                        </span>
                        {s.layout?.adjusted && <span title="Modificada">•</span>}
                        {hand && fit && (fit.fits || fit.fitsRotated) && (
                          <CBadge color="success">{fit.fits ? 'entra' : 'entra girada'}</CBadge>
                        )}
                      </CButton>
                    )
                  })}
                </div>
              </div>
            </CCol>
          </CRow>
        )}
      </CModalBody>

      <CModalFooter className="justify-content-between">
        <div className="d-flex gap-2 align-items-center">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => void editor.undo()}
            disabled={!editor.canUndo}
            title="Deshacer (Ctrl+Z)"
          >
            Deshacer
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => void editor.redo()}
            disabled={!editor.canRedo}
            title="Rehacer (Ctrl+Y)"
          >
            Rehacer
          </CButton>
          <CDropdown variant="btn-group">
            <CDropdownToggle color="secondary" variant="ghost" disabled={editor.busy}>
              Restaurar
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                as="button"
                onClick={() => void editor.restorePool()}
                disabled={!pool || !(pool.poolKey in editor.pins)}
              >
                Este material, como lo dejó el optimizador
              </CDropdownItem>
              <CDropdownItem
                as="button"
                onClick={() => void editor.restoreAll()}
                disabled={Object.keys(editor.pins).length === 0}
              >
                Todo el plan, como lo dejó el optimizador
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          {editor.busy && <CSpinner size="sm" />}
        </div>
        <div className="d-flex gap-2 align-items-center">
          {editor.blockedReason && !editor.busy && (
            <span className="small text-body-secondary">{editor.blockedReason}</span>
          )}
          <CButton color="secondary" variant="ghost" onClick={closeWithConfirm}>
            Cancelar
          </CButton>
          <CButton color="primary" disabled={!!editor.blockedReason || !evaluation} onClick={apply}>
            Aplicar
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  )
}

export default LayoutEditorModal
