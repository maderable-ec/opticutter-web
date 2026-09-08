import useZoomPan from 'src/shared/hooks/useZoomPan'
import ZoomControls from 'src/shared/components/ZoomControls'
import EdgeDimensions from 'src/shared/components/EdgeDimensions'
import BoardDimensions from 'src/shared/components/BoardDimensions'
import BoardGrain from 'src/shared/components/BoardGrain'
import {
  BOARD_LABEL,
  BOARD_OUTLINE,
  EDGE_COLOR,
  PIECE_LABEL,
  WASTE_FILL,
  WASTE_LABEL,
  WASTE_OUTLINE,
  bandedSides,
  boardDimsMargin,
  boardRotation,
  clamp,
  insetSideLine,
  pieceSig,
  remainderTitle,
  showPieceDims,
  showRemainderDims,
  uprightText,
} from 'src/shared/utils/cutDrawing'
import type { DrawableLayout, DrawnPiece } from 'src/shared/utils/cutDrawing'

interface SheetSvgProps<P extends DrawnPiece> {
  layout: DrawableLayout<P>
  colorFor: (sig: string) => string
  dimSig?: string | null
  highlightId?: string | null
  onPieceEnter?: (p: P) => void
  onPieceLeave?: () => void
  // Tap/click selection. Unlike hover, this is the only thing that works on a touch screen, so any
  // view that needs per-piece detail on mobile must wire this rather than onPieceEnter.
  onPieceTap?: (p: P) => void
  // Applied straight as the svg's CSS max-height, so a viewport-relative expression is allowed —
  // which is what the expanded modals need to stay inside their scrollport.
  maxHeight?: number | string
  // Shows board dimensions (width at top, height on the left). Expanded view only.
  showDimensions?: boolean
  // Enables zoom + pan (pinch/wheel/drag + buttons). Expanded view only.
  enableZoom?: boolean
  // Corner for the zoom buttons; see ZoomControls.placement.
  zoomPlacement?: 'top-right' | 'top-left'
  // Text drawn inside each piece when it's big enough. Defaults to its nominal dimensions.
  labelFor?: (p: P) => string
}

const defaultLabel = (p: DrawnPiece) =>
  `${p.originalWidth}×${p.originalHeight}${p.rotated ? ' ↻' : ''}`

// Renders one sheet of the cutting plan: the board, the hatched leftovers and every placed piece
// with its edge banding. Shared by the optimizer preview and the client's review diagram.
const SheetSvg = <P extends DrawnPiece>({
  layout,
  colorFor,
  dimSig,
  highlightId,
  onPieceEnter,
  onPieceLeave,
  onPieceTap,
  maxHeight = 420,
  showDimensions = false,
  enableZoom = false,
  zoomPlacement,
  labelFor = defaultLabel,
}: SheetSvgProps<P>) => {
  const { material, placedPieces, remainders } = layout
  const W = material.width
  const H = material.height
  const edgeWidth = clamp(Math.max(W, H) * 0.012, 8, 22)

  const { svgRef, groupTransform, scale, isZoomed, zoomIn, zoomOut, reset } = useZoomPan()

  // Extra margin reserved for the board dimension labels (expanded view only).
  const margin = showDimensions ? boardDimsMargin(W, H) : 0
  const labelSize = clamp(Math.max(W, H) * 0.028, 16, 44)

  const svg = (
    <svg
      ref={enableZoom ? svgRef : undefined}
      viewBox={`${-margin} ${-margin} ${H + margin} ${W + margin}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        maxHeight,
        // Not zoomed: let the browser scroll the page vertically (pinch is still ours). Zoomed:
        // take full control to pan with one finger. Anything else traps the finger on the diagram.
        touchAction: enableZoom ? (isZoomed ? 'none' : 'pan-y') : undefined,
        cursor: enableZoom && isZoomed ? 'grab' : undefined,
      }}
      role="img"
      aria-label={`Hoja ${material.width}×${material.height} con ${placedPieces.length} piezas`}
    >
      {/* Board dimensions: in landscape space, outside the rotation (top = H, side = W). */}
      {showDimensions && (
        <g transform={enableZoom ? groupTransform : undefined}>
          <BoardDimensions
            boardWidth={W}
            boardHeight={H}
            margin={margin}
            fontSize={labelSize}
            color={BOARD_LABEL}
          />
        </g>
      )}

      {/* Board and pieces rotated 90° clockwise (landscape); text is counter-rotated to stay readable. */}
      <g transform={enableZoom ? `${groupTransform} ${boardRotation(H)}` : boardRotation(H)}>
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="#ffffff"
          stroke={BOARD_OUTLINE}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* Offcuts / waste: a flat fill inside a dashed outline, which is already the whole
            difference from the white of an uncovered area. The diagonal hatching this used to
            carry answered a question the size labels now answer better (see the dimensions group
            below), it fought those very labels for legibility, and it was a second repeating
            texture competing with the grain. The <title> carries the size regardless of the
            on-screen scale. */}
        {remainders.map((r, idx) => (
          <g key={`rem-${idx}`}>
            <title>{remainderTitle(r)}</title>
            <rect
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill={WASTE_FILL}
              stroke={WASTE_OUTLINE}
              strokeWidth={1}
              strokeDasharray="6 6"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}

        {placedPieces.map((p) => {
          const sig = pieceSig(p)
          const color = colorFor(sig)
          const dimmed =
            highlightId != null ? p.pieceId !== highlightId : dimSig != null && sig !== dimSig

          return (
            <g
              key={p.pieceId}
              opacity={dimmed ? 0.35 : 1}
              onMouseEnter={() => onPieceEnter?.(p)}
              onMouseLeave={() => onPieceLeave?.()}
              onClick={onPieceTap ? () => onPieceTap(p) : undefined}
              role={onPieceTap ? 'button' : undefined}
              style={{ cursor: onPieceTap ? 'pointer' : 'default' }}
            >
              <title>
                {p.originalWidth}×{p.originalHeight} mm{p.rotated ? ' (rotada 90°)' : ''}
              </title>
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                fill={color}
                fillOpacity={0.85}
                stroke={highlightId === p.pieceId ? BOARD_OUTLINE : 'rgba(0,0,0,0.35)'}
                strokeWidth={highlightId === p.pieceId ? 3 : 1}
                vectorEffect="non-scaling-stroke"
              />

              {/* Edge banding: thick band inset from the piece border (does not overlap the cut line) */}
              {bandedSides(p).map((side) => {
                const l = insetSideLine(side, p.x, p.y, p.width, p.height, edgeWidth)
                return (
                  <line
                    key={`${p.pieceId}-${side}`}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke={EDGE_COLOR}
                    strokeWidth={edgeWidth}
                    strokeLinecap="butt"
                  />
                )
              })}
            </g>
          )
        })}

        {/* The sheet's grain, over everything on it: it belongs to the board, not to the pieces. */}
        <BoardGrain boardWidth={W} boardHeight={H} />

        {/* Piece names, ABOVE the grain — the measurements were always safe, since they live in the
            screen-space group below, which paints after this one. Left inside the piece groups the
            texture ran straight through the client's own labels. `pointerEvents: none`, so hover
            and tap still land on the piece rect underneath. */}
        {placedPieces.map((p) => {
          const sig = pieceSig(p)
          const text = labelFor(p)
          // Only a real piece name (the client review), never the dimension fallback: the
          // measurements live on the edges.
          const centeredLabel = text === defaultLabel(p) || text === pieceSig(p) ? '' : text
          if (!centeredLabel || !showPieceDims(p.width, p.height, scale)) return null
          const dimmed =
            highlightId != null ? p.pieceId !== highlightId : dimSig != null && sig !== dimSig
          const cx = p.x + p.width / 2
          const cy = p.y + p.height / 2
          return (
            <text
              key={`label-${p.pieceId}`}
              x={cx}
              y={cy}
              opacity={dimmed ? 0.35 : 1}
              fontSize={clamp(Math.min(p.width, p.height) / 5, 22, 90)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={PIECE_LABEL}
              transform={uprightText(cx, cy)}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {centeredLabel}
            </text>
          )
        })}
      </g>

      {/* Measurements drawn on the edges (not centered): positioned in screen space, so this is
          a sibling of the rotated board group carrying the same zoom/pan transform as the
          board-dimension labels. Same reveal rule as the shapes themselves. */}
      <g transform={enableZoom ? groupTransform : undefined}>
        {remainders.map((r, idx) =>
          showRemainderDims(r.width, r.height, scale) ? (
            <EdgeDimensions
              key={`rem-dim-${idx}`}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              boardHeight={H}
              fontSize={clamp(Math.min(r.width, r.height) / 7, 14, 56)}
              color={WASTE_LABEL}
            />
          ) : null,
        )}
        {placedPieces.map((p) => {
          if (!showPieceDims(p.width, p.height, scale)) return null
          const sig = pieceSig(p)
          const dimmed =
            highlightId != null ? p.pieceId !== highlightId : dimSig != null && sig !== dimSig
          return (
            <g key={`piece-dim-${p.pieceId}`} opacity={dimmed ? 0.35 : 1}>
              <EdgeDimensions
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                boardHeight={H}
                fontSize={clamp(Math.min(p.width, p.height) / 6, 16, 64)}
                color={PIECE_LABEL}
                suffix={p.rotated ? ' ↻' : ''}
              />
            </g>
          )
        })}
      </g>
    </svg>
  )

  if (!enableZoom) return svg

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {svg}
      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={reset}
        isZoomed={isZoomed}
        placement={zoomPlacement}
      />
    </div>
  )
}

export default SheetSvg
