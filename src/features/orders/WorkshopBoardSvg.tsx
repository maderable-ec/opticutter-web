import {
  BOARD_LABEL,
  EDGE_COLOR,
  PIECE_LABEL,
  WASTE_LABEL,
  bandedSides,
  boardDimsMargin,
  boardRotation,
  clamp,
  insetSideLine,
  pieceSig,
  showPieceDims,
  showRemainderDims,
  splitNotation,
  uprightText,
} from 'src/shared/utils/cutDrawing'
import useZoomPan from 'src/shared/hooks/useZoomPan'
import { useSwipeNav } from 'src/shared/hooks/useSwipeNav'
import ZoomControls from 'src/shared/components/ZoomControls'
import BoardDimensions from 'src/shared/components/BoardDimensions'
import BoardGrain from 'src/shared/components/BoardGrain'
import EdgeDimensions from 'src/shared/components/EdgeDimensions'
import type { CutBoard, CutPiece } from './types'

interface WorkshopBoardSvgProps {
  board: CutBoard
  colorFor: (sig: string) => string
  // Pieces can only be tapped/marked when the order is in `cutting` state. Other states are read-only.
  interactive: boolean
  // Single tap marks the piece as cut; double-tap unmarks it (no confirmation).
  onPieceTap: (piece: CutPiece) => void
  onPieceUntap: (piece: CutPiece) => void
  // Paging to the neighbouring board with a horizontal swipe. A shortcut, never the only way: the
  // `‹ ›` in the top bar stays. Omitted at either end of the queue.
  onPrevBoard?: () => void
  onNextBoard?: () => void
}

const CHECK_COLOR = '#2b8a3e' // verde del ✓ de pieza cortada

// Renders a physical board from the cutting plan using the same geometry as the optimizer, adding
// per-piece cut state (dimmed + ✓), the edge-banding notation, hatched waste areas, and a tap
// target over each full rectangle. It fills the height its container gives it — the page owns the
// viewport, this owns the drawing.
const WorkshopBoardSvg = ({
  board,
  colorFor,
  interactive,
  onPieceTap,
  onPieceUntap,
  onPrevBoard,
  onNextBoard,
}: WorkshopBoardSvgProps) => {
  const W = board.width
  const H = board.height
  const edgeWidth = clamp(Math.max(W, H) * 0.012, 8, 22)
  // Room reserved outside the sheet for its own two measurements. Same proportions as the
  // optimizer's diagram: the right board has to be picked off the rack first, and this canvas never
  // said which one it was drawing.
  const margin = boardDimsMargin(W, H)
  const boardLabelSize = clamp(Math.max(W, H) * 0.028, 16, 44)

  // Zoom for inspecting/tapping small pieces. doubleClickZoom disabled: double-tap must not
  // interfere with the "tap = mark as cut" interaction.
  const { svgRef, groupTransform, scale, isZoomed, zoomIn, zoomOut, reset } = useZoomPan({
    doubleClickZoom: false,
  })

  // Swipe belongs HERE and not on the page: this is what knows about the zoom. Once zoomed, a
  // horizontal drag is a pan and the gesture has to be off, or the board changes under the finger
  // that was inspecting it. Unzoomed, `useZoomPan` still swallows the click of any drag past its
  // own threshold, so a swipe cannot mark a piece on its way out.
  const swipeRef = useSwipeNav({
    onPrev: onPrevBoard,
    onNext: onNextBoard,
    enabled: !isZoomed,
  })

  // Everything each piece needs, resolved once: the shapes and the text over them are painted in
  // two separate passes (the grain runs between them, see below), and working the notation's fit
  // out in each pass would be two copies of one rule.
  const drawn = board.pieces.map((piece) => {
    const minSide = Math.min(piece.width, piece.height)
    // Edge-banding notation, printed VERBATIM: the server computes it from the piece's nominal
    // sides, so it survives rotation. Recomputing it from `edges.sides` (which is rotated into the
    // drawing's frame) would turn every 1L into a 1C.
    const [notation, bandNote] = splitNotation(piece.edges?.notation)
    // On screen the piece's y axis runs horizontally and its x axis vertically, because of
    // `boardRotation` — the same frame `EdgeDimensions` documents. So the room a horizontal label
    // has is `piece.height` wide by `piece.width` tall.
    //
    // Same rate as the measurements (`Math.min(w, h) / 6`), with a ceiling just under theirs. It
    // used to be set at nearly twice their size, which made a qualifier shout over the numbers it
    // qualifies; dropping it to `/7` overcorrected and left the canto reading as a footnote.
    // Matching the rate and separating them by position — canto in the middle, measurements on the
    // edges — is the hierarchy that actually works. The second term is what keeps a long notation
    // inside a narrow piece.
    const noteSize = clamp(
      Math.min(minSide / 6, piece.height / Math.max(notation.length * 0.62, 1)),
      14,
      56,
    )
    // A cut piece belongs to the ✓: the canto no longer decides anything there. Revealed earlier
    // than the measurements (a 4-character string needs far less room), and the qualifier only once
    // the piece is big enough for two lines.
    const showNote =
      !piece.cut && !!notation && piece.width * scale > 60 && piece.height * scale > 60
    return {
      piece,
      color: colorFor(pieceSig(piece)),
      cx: piece.x + piece.width / 2,
      cy: piece.y + piece.height / 2,
      checkSize: clamp(minSide * 0.55, 36, 220),
      notation,
      bandNote,
      noteSize,
      showNote,
      showBandNote: showNote && !!bandNote && showPieceDims(piece.width, piece.height, scale),
    }
  })

  return (
    <div ref={swipeRef} className="workshop-stage">
      <svg
        ref={svgRef}
        viewBox={`${-margin} ${-margin} ${H + margin} ${W + margin}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          // Not zoomed: leave the vertical axis to the browser and the horizontal one to the swipe
          // (pinch is still ours). Zoomed: take full control to pan the diagram with one finger.
          touchAction: isZoomed ? 'none' : 'pan-y',
          cursor: isZoomed ? 'grab' : undefined,
        }}
        role="img"
        aria-label={`Tablero ${board.sheetNumber}: ${W}×${H} con ${board.pieces.length} piezas${board.halfBoard ? ' (medio tablero)' : ''}`}
      >
        {/* Board rotated 90° clockwise (landscape); text counter-rotated to stay readable. */}
        <g transform={`${groupTransform} ${boardRotation(H)}`}>
          {/* Tablero */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="#ffffff"
            stroke="#868e96"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* Remainders / waste: a flat fill inside a dashed outline, which is already the whole
              difference from the white of an uncovered area. Their size is drawn on the edges (see
              the dimensions group below) so the shop can set aside the retazos worth keeping — this
              is a touch screen, there is no hover — and the diagonal hatching this used to carry was
              fighting those very numbers for legibility, on the one surface read at arm's length. */}
          {(board.remainders ?? []).map((r, idx) => (
            <rect
              key={`rem-${idx}`}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill="#f1f3f5"
              stroke="#ced4da"
              strokeWidth={1}
              strokeDasharray="6 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Piezas: solo las formas. El texto va en una segunda pasada, sobre la veta. */}
          {drawn.map(({ piece: p, color }) => (
            <g
              key={p.id}
              role={interactive ? 'button' : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onClick={interactive ? () => onPieceTap(p) : undefined}
              onDoubleClick={interactive ? () => onPieceUntap(p) : undefined}
            >
              <title>
                {p.label} · {p.originalWidth}×{p.originalHeight} mm
                {p.rotated ? ' (rotada 90°)' : ''}
                {p.edges?.notation ? ` · canto ${p.edges.notation}` : ''}
                {p.cut ? ' — cortada' : ''}
                {p.cut && p.cutByLabel ? ` por ${p.cutByLabel}` : ''}
              </title>

              {/* Piece visual: dimmed when already cut */}
              <g opacity={p.cut ? 0.35 : 1}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.width}
                  height={p.height}
                  fill={color}
                  fillOpacity={0.85}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />

                {/* Edge banding: thick inset band (does not overlap the cut line) */}
                {bandedSides(p).map((side) => {
                  const l = insetSideLine(side, p.x, p.y, p.width, p.height, edgeWidth)
                  return (
                    <line
                      key={`${p.id}-${side}`}
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
            </g>
          ))}

          {/* The sheet's grain, over everything on it: which way round to lay the board is the
              first decision at the saw, and it belongs to the sheet, not to the pieces. */}
          <BoardGrain boardWidth={W} boardHeight={H} />

          {/* Piece text, ABOVE the grain. The measurements were always safe — they live in the
              screen-space group below, which paints after this one — and leaving the canto and the
              ✓ inside the piece groups had the texture running straight through them. Both are
              `pointerEvents: none`, so a tap still lands on the piece rect underneath. */}
          {drawn.map(
            ({
              piece: p,
              cx,
              cy,
              checkSize,
              notation,
              bandNote,
              noteSize,
              showNote,
              showBandNote,
            }) => (
              <g key={`label-${p.id}`}>
                {/* Edge-banding notation over the piece it belongs to: how many sides are banded is
                    what decides the cut, so it leads; the type and alias name the tapacanto to fetch
                    and ride underneath, smaller.

                    Plain text, in the same colour and weight as the measurements on the edges. It
                    used to be bold and haloed in white for legibility on a dusty shop screen, which
                    made a qualifier shout louder than the numbers it qualifies — and the
                    measurements have always read over these same fills without any of it. */}
                {showNote && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={PIECE_LABEL}
                    transform={uprightText(cx, cy)}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    <tspan x={cx} dy={showBandNote ? -noteSize * 0.32 : 0} fontSize={noteSize}>
                      {notation}
                    </tspan>
                    {showBandNote && (
                      <tspan x={cx} dy={noteSize * 0.9} fontSize={noteSize * 0.75}>
                        {bandNote}
                      </tspan>
                    )}
                  </text>
                )}

                {/* ✓ at full opacity above the dimmed layer, so the cut state reads at a glance */}
                {p.cut && (
                  <text
                    x={cx}
                    y={cy}
                    fontSize={checkSize}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={CHECK_COLOR}
                    fontWeight={700}
                    transform={uprightText(cx, cy)}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ✓
                  </text>
                )}
              </g>
            ),
          )}
        </g>

        {/* Measurements drawn on the edges (not centered): positioned in screen space, so this
            sits outside the rotated board group but still carries its zoom/pan transform. Same
            reveal rule as the shapes themselves. */}
        <g transform={groupTransform}>
          <BoardDimensions
            boardWidth={W}
            boardHeight={H}
            margin={margin}
            fontSize={boardLabelSize}
            color={BOARD_LABEL}
          />
          {(board.remainders ?? []).map((r, idx) =>
            showRemainderDims(r.width, r.height, scale) ? (
              <EdgeDimensions
                key={`rem-dim-${idx}`}
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                boardHeight={H}
                // Bigger than the optimizer's: this is a shop panel read at arm's length, and a
                // retazo is the one number nobody can recover by measuring the drawing.
                fontSize={clamp(Math.min(r.width, r.height) / 3, 28, 56)}
                color={WASTE_LABEL}
              />
            ) : null,
          )}
          {board.pieces.map((p) =>
            showPieceDims(p.width, p.height, scale) ? (
              <g key={`piece-dim-${p.id}`} opacity={p.cut ? 0.35 : 1}>
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
            ) : null,
          )}
        </g>
      </svg>
      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset} isZoomed={isZoomed} />
    </div>
  )
}

export default WorkshopBoardSvg
