import { uprightText } from 'src/shared/utils/cutDrawing'

interface EdgeDimensionsProps {
  // Rectangle in board mm (the same space the pieces and remainders use).
  x: number
  y: number
  width: number
  height: number
  // The board's mm height (H). A board-space point (x, y) sits at (H - y, x) on screen
  // once `boardRotation(H)` has run, and this component works in that screen space.
  boardHeight: number
  fontSize: number
  color: string
  // Appended to the width label, e.g. " ↻" for a rotated piece.
  suffix?: string
}

// Average glyph advance as a fraction of the font size. Rough on purpose: this only decides whether
// a number is drawn, and measuring real text means a layout pass per rectangle on a sheet that holds
// hundreds of them.
const GLYPH_RATIO = 0.6

// Draws a rectangle's two measurements ON its edges instead of centered: the mm height
// along the top edge (horizontal text) and the mm width along the left edge (rotated 90°,
// reading bottom-to-top). This is the pattern `PiecePreview` (features/optimizer/sheetDetail)
// already uses for a standalone piece, lifted out so the sheet and workshop diagrams share it.
//
// Render it OUTSIDE the `boardRotation` group — as a sibling carrying the same zoom/pan
// transform as the board-dimension labels — because it positions in screen space.
//
// **Each number is dropped on its own**, the way the PDF has always done it
// (`visualization.py`, "Each is dropped if it doesn't fit"). Deciding for the pair meant a long thin
// offcut — a 106×2500 strip, the shape the shop most needs to measure before deciding whether to
// keep it — lost BOTH numbers over the 106, when the 2500 had all the room in the world.
const EdgeDimensions = ({
  x,
  y,
  width,
  height,
  boardHeight,
  fontSize,
  color,
  suffix = '',
}: EdgeDimensionsProps) => {
  // Screen-space box of this rectangle after the 90° CW board rotation.
  const left = boardHeight - (y + height)
  const top = x
  const inset = fontSize * 0.9

  // mm height runs horizontally on screen: label centered along the top edge.
  const hx = left + height / 2
  const hy = top + inset
  // mm width runs vertically on screen: label centered along the left edge, rotated upright.
  const wx = left + inset
  const wy = top + width / 2

  const hText = String(Math.round(height))
  const wText = `${Math.round(width)}${suffix}`

  // A label needs room ALONG the edge it runs on for its glyphs, and room ACROSS that edge for the
  // line itself plus the inset that holds it off the border.
  const fits = (text: string, along: number, across: number) =>
    text.length * fontSize * GLYPH_RATIO <= along && inset + fontSize <= across

  const showHeight = fits(hText, height, width)
  const showWidth = fits(wText, width, height)
  if (!showHeight && !showWidth) return null

  return (
    <g fill={color} style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {showHeight && (
        <text x={hx} y={hy} fontSize={fontSize} textAnchor="middle" dominantBaseline="central">
          {hText}
        </text>
      )}
      {showWidth && (
        <text
          x={wx}
          y={wy}
          fontSize={fontSize}
          textAnchor="middle"
          dominantBaseline="central"
          transform={uprightText(wx, wy)}
        >
          {wText}
        </text>
      )}
    </g>
  )
}

export default EdgeDimensions
