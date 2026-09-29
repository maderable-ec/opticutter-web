import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CBadge,
  CButton,
  CCol,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFullscreen, cilMove } from '@coreui/icons'

import { track } from 'src/shared/analytics'
import SheetSvg from 'src/shared/components/SheetSvg'
import { stripHalfSuffix } from 'src/shared/utils/halfBoard'
import { fmtMoney } from 'src/features/review/format'
import type { EditorFocus } from './layoutEditor/useLayoutEditor'
import type { AdjustmentSummary, LayoutGroup, MaterialSummary, ModalContainer } from './types'
import { usePieceColors } from './pieceColors'
import { SheetInspector, useArrowPaging, useSheetHover } from './sheetDetail'

// One summary line + a fullscreen sheet viewer behind it, for the pre-order detail page (through
// `OptimizationPreview`). The wizard shows the same viewer as a step of its own (`LayoutStep`), built
// from the pieces exported here and in `sheetDetail.tsx`, so the two read a plan the same way.
//
// It used to be a grid of pattern cards, each with a thumbnail, an efficiency bar and a stats strip.
// On a real quote that is two or three rows of cards — the single tallest thing on a page whose job
// is to be read at a glance, and every card was a link to the same modal. So the grid collapsed to
// the numbers it was summarising, and the modal it opened became the diagram itself.

// --- Shared by the modal and the wizard's Optimización step ---

// Totals of a plan. Weighted by `count`: a pattern repeated over four sheets weighs four times one
// used once, which is what "aprovechamiento del plan" means. A plain mean would let a single offcut
// sheet drag the whole figure down.
export const planTotals = (layoutGroups: LayoutGroup[]) => {
  let sheets = 0
  let pieces = 0
  let effSum = 0
  for (const g of layoutGroups) {
    sheets += g.count
    pieces += g.layout.statistics.piecesCount * g.count
    effSum += g.layout.statistics.efficiency * g.count
  }
  return { sheets, pieces, efficiency: sheets > 0 ? effSum / sheets : 0 }
}

// The board's catalog name, for the header of each sheet.
export const materialNameFor =
  (materialsSummary: MaterialSummary[]) =>
  (materialKey: string): string => {
    const m = materialsSummary.find((x) => x.materialKey === materialKey)
    if (!m) return materialKey
    return m.productName ?? m.productCode ?? `${m.width}×${m.height}×${m.thickness} mm`
  }

// "Patrón 3 · ×2 hojas · Melamina blanca 18": what the sheet on screen is.
export const patternTitle = (group: LayoutGroup, materialName: string): string =>
  `Patrón ${group.patternId}${group.count > 1 ? ` · ×${group.count} hojas` : ''}${
    materialName ? ` · ${stripHalfSuffix(materialName)}` : ''
  }`

// Where the layout editor opens: on the sheet the viewer is showing.
export const editorFocusOf = (group: LayoutGroup): EditorFocus => ({
  materialKey: group.layout.material.materialKey,
  sheetNumber: group.layout.material.sheetNumber,
})

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

interface PlanFactsProps {
  layoutGroups: LayoutGroup[]
  // Extra facts from whoever mounts it, placed after the counts and before the verdict.
  extra?: ReactNode
  // What the seller's hand adjustments changed, when the plan carries any.
  adjustment?: AdjustmentSummary | null
}

// The plan in one line: patterns · sheets · pieces, then the efficiency and whether it was adjusted
// by hand. The pre-order's diagram bar and the wizard's Optimización footer both say it this way.
export const PlanFacts = ({ layoutGroups, extra, adjustment }: PlanFactsProps) => {
  const totals = useMemo(() => planTotals(layoutGroups), [layoutGroups])
  const adjusted = adjustment ? adjustmentLine(adjustment) : ''
  return (
    <>
      <span className="small">
        <strong>{layoutGroups.length}</strong> {plural(layoutGroups.length, 'patrón', 'patrones')} ·{' '}
        <strong>{totals.sheets}</strong> {plural(totals.sheets, 'tablero', 'tableros')} ·{' '}
        <strong>{totals.pieces}</strong> {plural(totals.pieces, 'pieza', 'piezas')}
      </span>
      {extra}
      {/* The one number worth a colour: below 80% the plan is worth a second look. Last, after every
          plain measurement: it is the verdict on the list, not another item in it. */}
      <CBadge color={totals.efficiency >= 80 ? 'success' : 'warning'}>
        {totals.efficiency.toFixed(1)}% aprovechamiento
      </CBadge>
      {/* A plan the seller rearranged says so, and what it changed, where the plan is summed up. */}
      {adjustment && (
        <CBadge color="info" title={adjusted || undefined}>
          Ajustado a mano
          {adjusted ? ` · ${adjusted}` : ''}
        </CBadge>
      )}
    </>
  )
}

// The viewer as analytics sees it: when it opened and which sheets were paged to. Whether the seller
// reads the plan or glances and moves on is the question. A viewer that goes away while open (the
// page unmounts, the wizard leaves the step) reports its close too.
export const useDiagramViewTracking = (layoutGroups: LayoutGroup[]) => {
  const view = useRef<{ openedAt: number; seen: Set<number> } | null>(null)

  // Idempotent: the wizard's step opens it from an effect, which StrictMode runs twice.
  const open = useCallback(() => {
    if (view.current) return
    view.current = { openedAt: Date.now(), seen: new Set([0]) }
    track('cut_diagram_opened', {
      patterns: layoutGroups.length,
      sheets: planTotals(layoutGroups).sheets,
    })
  }, [layoutGroups])

  const page = useCallback((i: number) => {
    view.current?.seen.add(i)
  }, [])

  const close = useCallback(
    (reason: 'close' | 'adjust') => {
      if (!view.current) return
      track('cut_diagram_closed', {
        patterns: layoutGroups.length,
        patterns_seen: view.current.seen.size,
        seconds_open: Math.round((Date.now() - view.current.openedAt) / 1000),
        reason,
      })
      view.current = null
    },
    [layoutGroups],
  )

  const closeOnUnmount = useRef(close)
  useEffect(() => {
    closeOnUnmount.current = close
  }, [close])
  useEffect(() => () => closeOnUnmount.current('close'), [])

  return { open, page, close }
}

// --- Sheet detail modal ---

interface SheetDetailModalProps {
  groups: LayoutGroup[]
  // Index of the open sheet within `groups`; null = closed. Owned by the parent so the modal can
  // page between sheets without closing.
  index: number | null
  onIndexChange: (i: number) => void
  materialNameFor: (materialKey: string) => string
  colorFor: (sig: string) => string
  // Where to portal the modal. Needed so it stays inside the element put into fullscreen —
  // document.body sits outside it and the modal would render invisibly behind the page.
  container?: ModalContainer
  onClose: () => void
  // "Ajustar distribución": the seller decides to adjust while LOOKING at the plan, so the way in
  // is here, and it opens the editor on the sheet on screen. `adjustDisabledReason` greys it out.
  onAdjust?: (focus: EditorFocus) => void
  adjustDisabledReason?: string
}

const SheetDetailModal = ({
  groups,
  index,
  onIndexChange,
  materialNameFor,
  colorFor,
  container,
  onClose,
  onAdjust,
  adjustDisabledReason,
}: SheetDetailModalProps) => {
  const group = index == null ? null : (groups[index] ?? null)
  const { hoverPiece, hoverSig, setHoverSig, inspect, leave } = useSheetHover(group)

  const hasPrev = index != null && index > 0
  const hasNext = index != null && index < groups.length - 1
  const go = (delta: number) => {
    if (index != null) onIndexChange(index + delta)
  }

  useArrowPaging({ index, count: groups.length, onChange: onIndexChange })

  const layout = group?.layout
  const materialName = group ? materialNameFor(group.materialKey) : ''

  return (
    <CModal
      visible={index != null}
      onClose={onClose}
      // Fullscreen, not a centered `xl`: this is now the only way to see the plan, and the page it
      // opens over is `fluid`. A 1140px dialog would have shown the sheet smaller than the grid did.
      fullscreen
      scrollable
      container={container}
    >
      <CModalHeader className="d-flex align-items-center gap-2">
        {/* The title grows to fill the bar so the button sits beside the close cross: Bootstrap's
            `.btn-close` already carries `margin-left: auto`, and a second auto margin would park
            the button in the middle of the header. */}
        <CModalTitle className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
          <span>{group ? patternTitle(group, materialName) : ''}</span>
          {group?.layout.material.halfBoard && <CBadge color="info">½ medio</CBadge>}
        </CModalTitle>
        {onAdjust && group && (
          // The wrapper carries the tooltip: a disabled button fires no pointer events.
          <span title={adjustDisabledReason}>
            <CButton
              size="sm"
              color="primary"
              variant="outline"
              disabled={!!adjustDisabledReason}
              onClick={() => onAdjust(editorFocusOf(group))}
            >
              <CIcon icon={cilMove} className="me-1" />
              Ajustar distribución
            </CButton>
          </span>
        )}
      </CModalHeader>
      <CModalBody style={{ scrollbarGutter: 'stable' }}>
        {layout && (
          <CRow className="g-3">
            <CCol
              xs={12}
              lg={7}
              xxl={8}
              className="align-self-start sheet-overlay-stage"
              style={{ position: 'sticky', top: 0, zIndex: 1 }}
            >
              <SheetSvg
                // Remount per sheet so zoom/pan resets instead of carrying over from the previous
                // pattern, which would land the next one off-screen.
                key={index}
                layout={layout}
                colorFor={colorFor}
                highlightId={hoverPiece?.pieceId ?? null}
                dimSig={hoverSig}
                onPieceEnter={inspect}
                onPieceLeave={leave}
                // Tapping is the only way to inspect a piece on a touch screen, where there is no
                // hover at all.
                onPieceTap={inspect}
                // The column is sticky, so anything taller than the modal's scrollport can never be
                // scrolled into view: its bottom edge stays clipped right where the pager sits.
                // Reserve is the modal chrome around the body — header, footer, padding. No upper
                // cap now that the dialog is fullscreen: the sheet is what the screen is for.
                maxHeight="calc(100dvh - 12rem)"
                showDimensions
                enableZoom
              />
            </CCol>
            <CCol xs={12} lg={5} xxl={4}>
              <SheetInspector
                layout={layout}
                colorFor={colorFor}
                hoverPiece={hoverPiece}
                hoverSig={hoverSig}
                onHoverSig={setHoverSig}
              />
            </CCol>
          </CRow>
        )}
      </CModalBody>
      {groups.length > 1 && (
        // Paging between patterns without closing: checking one sheet against the next is the whole
        // point of the expanded view, and reopening from the grid each time loses the comparison.
        <CModalFooter className="justify-content-between">
          <CButton
            color="secondary"
            variant="outline"
            disabled={!hasPrev}
            onClick={() => go(-1)}
            aria-label="Hoja anterior"
          >
            ‹ Anterior
          </CButton>
          <span className="text-body-secondary small text-nowrap">
            {(index ?? 0) + 1} / {groups.length}
          </span>
          <CButton
            color="secondary"
            variant="outline"
            disabled={!hasNext}
            onClick={() => go(1)}
            aria-label="Hoja siguiente"
          >
            Siguiente ›
          </CButton>
        </CModalFooter>
      )}
    </CModal>
  )
}

// --- Main diagram ---

interface CutLayoutDiagramProps {
  layoutGroups: LayoutGroup[]
  materialsSummary: MaterialSummary[]
  // Extra facts for the bar, placed after the counts (see `PlanFacts`). The pre-order page passes
  // nothing today; the wizard's Optimización step puts its linear metres and alternative seed in the
  // same slot of `PlanFacts`, in its footer.
  extra?: ReactNode
  // Portal target for the expanded-sheet modal; see SheetDetailModalProps.container.
  modalContainer?: ModalContainer
  // Opens the layout editor, from the diagram viewer, on the sheet it shows. Absent where the plan
  // cannot be adjusted (a closed quote, the review, the workshop); `adjustDisabledReason` greys the
  // button out and says why.
  onAdjust?: (focus: EditorFocus) => void
  adjustDisabledReason?: string
  // What the seller's hand adjustments changed, when the plan carries any.
  adjustment?: AdjustmentSummary | null
}

// "3 piezas movidas · 1 tablero menos · −$42.10": what a hand adjustment did, in one line. Only the
// parts that moved: an offcut kept whole changes no piece and no price, and "0 piezas movidas"
// would say nothing. Empty when nothing is left to say.
export const adjustmentLine = (a: AdjustmentSummary): string => {
  const parts: string[] = []
  if (a.movedPieces > 0) {
    parts.push(`${a.movedPieces} ${a.movedPieces === 1 ? 'pieza movida' : 'piezas movidas'}`)
  }
  const whole = a.wholeOffcuts ?? 0
  if (whole > 0) {
    parts.push(`${whole} ${whole === 1 ? 'retazo entero' : 'retazos enteros'}`)
  }
  if (a.boardsDelta !== 0) {
    const n = Math.abs(a.boardsDelta)
    parts.push(`${n} ${n === 1 ? 'tablero' : 'tableros'} ${a.boardsDelta < 0 ? 'menos' : 'más'}`)
  }
  if (a.boardCostDelta !== 0) {
    parts.push(`${a.boardCostDelta < 0 ? '−' : '+'}${fmtMoney(Math.abs(a.boardCostDelta))}`)
  }
  return parts.join(' · ')
}

const CutLayoutDiagram = ({
  layoutGroups,
  materialsSummary,
  extra,
  modalContainer,
  onAdjust,
  adjustDisabledReason,
  adjustment,
}: CutLayoutDiagramProps) => {
  // The open sheet is held as an INDEX, not the group object, so the modal can page to the next one.
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const tracking = useDiagramViewTracking(layoutGroups)

  const { colorFor } = usePieceColors(layoutGroups)
  const materialName = useMemo(() => materialNameFor(materialsSummary), [materialsSummary])

  const openViewer = () => {
    tracking.open()
    setDetailIndex(0)
  }

  const pageViewer = (i: number) => {
    tracking.page(i)
    setDetailIndex(i)
  }

  const closeViewer = (reason: 'close' | 'adjust') => {
    tracking.close(reason)
    setDetailIndex(null)
  }

  if (!layoutGroups.length) return null

  return (
    <div>
      {/* No colour key either. It listed every distinct measurement in the plan — a dozen swatches
          on a busy quote — to explain a colour that identifies nothing on its own: the sheets label
          each piece with its own measurement already. Hovering a piece inside the viewer still dims
          the rest, which is what the key was actually used for. */}
      <div className="d-flex flex-wrap align-items-center gap-2 border rounded-3 p-2 mb-3">
        <span className="small text-body-secondary text-uppercase fw-semibold">
          Diagrama de cortes
        </span>
        <PlanFacts layoutGroups={layoutGroups} extra={extra} adjustment={adjustment} />
        <CButton
          size="sm"
          color="primary"
          variant="outline"
          className="ms-auto"
          onClick={openViewer}
        >
          <CIcon icon={cilFullscreen} className="me-1" />
          Ver diagrama
        </CButton>
      </div>

      <SheetDetailModal
        groups={layoutGroups}
        index={detailIndex}
        onIndexChange={pageViewer}
        materialNameFor={materialName}
        colorFor={colorFor}
        container={modalContainer}
        onClose={() => closeViewer('close')}
        onAdjust={
          onAdjust
            ? (focus) => {
                // The viewer steps aside for the editor, which opens on this same sheet.
                closeViewer('adjust')
                track('layout_editor_opened')
                onAdjust(focus)
              }
            : undefined
        }
        adjustDisabledReason={adjustDisabledReason}
      />
    </div>
  )
}

export default CutLayoutDiagram
