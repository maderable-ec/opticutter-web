import { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilChevronLeft,
  cilChevronRight,
  cilFullscreen,
  cilFullscreenExit,
  cilMove,
  cilSidebar,
} from '@coreui/icons'

import SheetSvg from 'src/shared/components/SheetSvg'
import { KEY } from 'src/shared/utils/platform'
import type { OptimizeResponse } from '../types'
import {
  editorFocusOf,
  materialNameFor,
  patternTitle,
  useDiagramViewTracking,
} from '../CutLayoutDiagram'
import { usePieceColors } from '../pieceColors'
import { SheetInspector, useArrowPaging, useSheetHover } from '../sheetDetail'
import UnplacedPiecesAlert from '../UnplacedPiecesAlert'
import LayoutIssuesAlert from '../layoutEditor/LayoutIssuesAlert'
import type { EditorFocus } from '../layoutEditor/useLayoutEditor'

// Step 2: the cut plan itself. It used to be a fullscreen modal behind a "Ver diagrama" button in
// Costos, and nearly every seller opened it — so it became a stop of its own. Not a page with the
// modal pasted in: the sheet is drawn straight on the page background, as large as the space allows,
// and what the modal kept in its header, side column and footer floats over it as light panels that
// still keep their own room (they never cover a piece).
//
// The search runs on ENTERING this step (the page's effect), exactly as it did on entering Costos.
// Everything around the sheet — which pattern, paging, "Ajustar distribución" — is the modal's, and
// is built from the same pieces (`sheetDetail.tsx`, `CutLayoutDiagram.tsx`), so the wizard and the
// pre-order page read a plan the same way. The plan's totals ride in the pinned footer, where the
// Despiece step keeps its own.

interface LayoutStepProps {
  // Absent until the first run lands.
  result?: OptimizeResponse
  // A cut SEARCH is in flight; the page covers the viewport with the optimizing overlay.
  isSearching: boolean
  error?: Error | null
  // The inputs changed since this result was computed and no run is on its way.
  isStale: boolean
  // The same run the actions menu starts; offered next to a failure so it is not a dead end.
  onRetry: () => void
  // Opens the layout editor on the sheet on screen; `adjustDisabledReason` says why it cannot.
  onAdjust?: (focus: EditorFocus) => void
  adjustDisabledReason?: string
  // The workspace's element fullscreen: the next step up from this one, for a sheet with nothing
  // but the trail and the footer around it.
  onToggleFullscreen?: () => void
  isFullscreen: boolean
}

const LayoutStep = ({
  result,
  isSearching,
  error,
  isStale,
  onRetry,
  onAdjust,
  adjustDisabledReason,
  onToggleFullscreen,
  isFullscreen,
}: LayoutStepProps) => {
  const groups = useMemo(() => result?.layoutGroups ?? [], [result])
  const materialName = useMemo(
    () => materialNameFor(result?.materialsSummary ?? []),
    [result?.materialsSummary],
  )
  const { colorFor } = usePieceColors(groups)

  // The pattern on screen. Kept across a new result — an adjustment just applied on pattern 3 should
  // come back to pattern 3 — and clamped for when the new plan has fewer of them.
  const [pickedIndex, setPickedIndex] = useState(0)
  const index = Math.min(pickedIndex, Math.max(groups.length - 1, 0))
  const group = groups[index] ?? null
  const { hoverPiece, hoverSig, setHoverSig, inspect, leave } = useSheetHover(group)

  // Open by default, as in the modal. Hiding it hands its width to the sheet, which pays off on a
  // long board (1220×2440, 2:1: width runs out first); a near-square one (2150×2440) is bound by the
  // height and gains nothing. Only from `lg`: below that the panels stack under the sheet.
  const [showInspector, setShowInspector] = useState(true)

  // Arriving here with a plan counts as looking at it, the way opening the modal did.
  const tracking = useDiagramViewTracking(groups)
  const { open: openView, page: pageView } = tracking
  const hasPlan = groups.length > 0
  useEffect(() => {
    if (hasPlan) openView()
  }, [hasPlan, openView])

  const goTo = useCallback(
    (i: number) => {
      pageView(i)
      setPickedIndex(i)
    },
    [pageView],
  )
  useArrowPaging({
    index: hasPlan ? index : null,
    count: groups.length,
    onChange: goTo,
    skipUnderModal: true,
  })

  const hasPrev = index > 0
  const hasNext = index < groups.length - 1

  return (
    <div className="plan-step">
      {error && (
        <CAlert color="danger" className="py-2 small d-flex flex-wrap align-items-center gap-2">
          <span>{error.message || 'Error al optimizar. Intente nuevamente.'}</span>
          <CButton size="sm" color="danger" variant="outline" className="ms-auto" onClick={onRetry}>
            Reintentar
          </CButton>
        </CAlert>
      )}

      {!result && !error && !isSearching && (
        <div className="surface text-body-secondary small">
          Todavía no hay un resultado. Usa “Optimizar” en el menú ⋮ ({`${KEY.mod}+${KEY.enter}`})
          para calcular la distribución de las piezas en los tableros.
        </div>
      )}

      {result && (
        <>
          {isStale && !isSearching && (
            <CAlert color="warning" className="py-2 small">
              Cambiaste el despiece desde este resultado. Vuelve a optimizar para verlo actualizado.
            </CAlert>
          )}
          {/* Above the plan: it changes what the seller does next rather than describing what was
              done. While it shows, the Cotización step stays locked. */}
          <UnplacedPiecesAlert
            unplaced={result.unplaced}
            materialsSummary={result.materialsSummary}
          />
          <LayoutIssuesAlert issues={result.layoutIssues} />
        </>
      )}

      {group && (
        <div className="plan-canvas" data-inspector={showInspector ? 'open' : 'closed'}>
          {/* What the modal's header and pager said, on one floating line over the sheet. */}
          <div className="plan-canvas__bar plan-float">
            <span className="fw-semibold small text-truncate" style={{ minWidth: 0 }}>
              {patternTitle(group, materialName(group.materialKey))}
            </span>
            {group.layout.material.halfBoard && <CBadge color="info">½ medio</CBadge>}

            <div className="ms-auto d-flex align-items-center gap-1">
              {groups.length > 1 && (
                <>
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="ghost"
                    disabled={!hasPrev}
                    onClick={() => goTo(index - 1)}
                    aria-label="Patrón anterior"
                    title="Patrón anterior (←)"
                  >
                    <CIcon icon={cilChevronLeft} />
                  </CButton>
                  <span className="small text-body-secondary text-nowrap">
                    {index + 1} / {groups.length}
                  </span>
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="ghost"
                    disabled={!hasNext}
                    onClick={() => goTo(index + 1)}
                    aria-label="Patrón siguiente"
                    title="Patrón siguiente (→)"
                  >
                    <CIcon icon={cilChevronRight} />
                  </CButton>
                </>
              )}

              {onAdjust && (
                // The wrapper carries the tooltip: a disabled button fires no pointer events.
                <span title={adjustDisabledReason} className="ms-1">
                  <CButton
                    size="sm"
                    color="primary"
                    variant="outline"
                    className="text-nowrap"
                    disabled={!!adjustDisabledReason}
                    onClick={() => onAdjust(editorFocusOf(group))}
                  >
                    <CIcon icon={cilMove} className="me-sm-1" />
                    <span className="d-none d-sm-inline">Ajustar distribución</span>
                  </CButton>
                </span>
              )}

              <CButton
                size="sm"
                color="secondary"
                variant="ghost"
                className="d-none d-lg-inline-flex"
                aria-pressed={showInspector}
                onClick={() => setShowInspector((v) => !v)}
                aria-label={showInspector ? 'Ocultar el detalle' : 'Mostrar el detalle'}
                title={showInspector ? 'Ocultar el detalle' : 'Mostrar el detalle'}
              >
                <CIcon icon={cilSidebar} />
              </CButton>

              {onToggleFullscreen && (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="ghost"
                  onClick={onToggleFullscreen}
                  aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  title={`${isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} (${KEY.mod}+${KEY.shift}+F)`}
                >
                  <CIcon icon={isFullscreen ? cilFullscreenExit : cilFullscreen} />
                </CButton>
              )}
            </div>
          </div>

          <div className="plan-canvas__sheet">
            <SheetSvg
              // Remount per pattern so zoom/pan resets instead of carrying over from the previous
              // one, which would land the next sheet off-screen.
              key={index}
              layout={group.layout}
              colorFor={colorFor}
              highlightId={hoverPiece?.pieceId ?? null}
              dimSig={hoverSig}
              onPieceEnter={inspect}
              onPieceLeave={leave}
              // The only way to inspect a piece on a touch screen, where there is no hover.
              onPieceTap={inspect}
              // Resolved against the stage from `lg` (see `.plan-canvas__sheet`), so the sheet
              // fills whatever the canvas has; below that the stage has no height of its own and
              // the sheet takes its natural one.
              maxHeight="100%"
              showDimensions
              enableZoom
            />
          </div>

          <aside className="plan-canvas__inspector plan-float" aria-label="Detalle del patrón">
            <SheetInspector
              layout={group.layout}
              colorFor={colorFor}
              hoverPiece={hoverPiece}
              hoverSig={hoverSig}
              onHoverSig={setHoverSig}
              emptyHint="Pasa el cursor o toca una pieza del diagrama para ver su detalle."
            />
          </aside>
        </div>
      )}
    </div>
  )
}

export default LayoutStep
