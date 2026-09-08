import { uprightText } from 'src/shared/utils/cutDrawing'

interface BoardDimensionsProps {
  // Board dimensions in mm: `boardWidth` is the ancho, `boardHeight` the largo.
  boardWidth: number
  boardHeight: number
  // Space reserved outside the board for these labels, in the same mm units.
  margin: number
  fontSize: number
  color: string
}

// The board's own two measurements, drawn OUTSIDE it: the largo along the top and the ancho down the
// left side. After `boardRotation` the largo runs horizontally, which is why the top label is the
// board's `height` and the side one its `width`.
//
// Render it in SCREEN space — outside the rotation, as a sibling carrying the same zoom/pan
// transform — and give the viewBox a matching negative offset, or the labels fall off the canvas.
// Lifted out of `SheetSvg` so the workshop sheet, which never had them, shows the same numbers: the
// right physical board has to come off the rack before anything else.
//
// **Bare numbers, no unit.** Every other measurement on the drawing — pieces, offcuts — is a bare
// number, so a `mm` here made the least important text the only one carrying a suffix. The unit is
// stated once, in the PDF's board header, which is a sentence rather than part of the picture.
const BoardDimensions = ({
  boardWidth,
  boardHeight,
  margin,
  fontSize,
  color,
}: BoardDimensionsProps) => (
  <g fill={color} style={{ userSelect: 'none', pointerEvents: 'none' }}>
    <text
      x={boardHeight / 2}
      y={-margin / 2}
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {Math.round(boardHeight)}
    </text>
    <text
      x={-margin / 2}
      y={boardWidth / 2}
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="central"
      transform={uprightText(-margin / 2, boardWidth / 2)}
    >
      {Math.round(boardWidth)}
    </text>
  </g>
)

export default BoardDimensions
