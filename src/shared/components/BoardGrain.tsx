import {
  GRAIN_COLOR,
  GRAIN_DASHES_MM,
  GRAIN_JITTER,
  GRAIN_OPACITY,
  GRAIN_STEP_MM,
  GRAIN_STROKE_MM,
  GRAIN_WEIGHTS,
} from 'src/shared/utils/cutDrawing'

interface BoardGrainProps {
  // Board dimensions in mm: `boardWidth` is the ancho, `boardHeight` the largo.
  boardWidth: number
  boardHeight: number
}

// Cycles a table by index. `noUncheckedIndexedAccess` types a modulo lookup as `T | undefined` even
// though it cannot be; the non-empty tuple type is what lets the fallback satisfy it without a cast.
const cycle = <T,>(table: readonly [T, ...T[]], index: number): T =>
  table[index % table.length] ?? table[0]

// The sheet's wood grain: one uniform texture across the whole board.
//
// The grain runs along the board's LARGO — its `height`, the first measurement everything in this
// system is entered with. `boardRotation` maps that axis to the horizontal one on screen, so in
// board space these lines are VERTICAL (constant x, spanning y from 0 to H) and come out horizontal
// in the drawing. Get that backwards and the picture still looks plausible while being wrong.
//
// Every line is broken, nudged off the grid and set at its own weight (see the tables): evenly
// spaced continuous rules read as ruled paper, and the irregularity is the whole difference between
// wood and a grid. The dash phase is per line too — without it the breaks of neighbouring lines
// queue up into a vertical seam, which reads as a cut on a drawing whose subject is where the cuts
// are. `strokeDasharray` runs along the line, i.e. along the largo, so the streaks lie with the
// grain rather than across it.
//
// Explicit lines rather than a `<pattern>`: a pattern's `userSpaceOnUse` grid is resolved against
// whatever transform is in force at the point of reference, and this one is referenced from inside a
// 90° rotation, so a browser that resolved it differently would silently turn the grain across the
// board. At this spacing it is well under a hundred nodes per sheet.
//
// Mount it as the LAST child of the rotated board group: it has to run over pieces and offcuts alike
// (the grain belongs to the sheet, not to what is cut out of it — a rotated piece does not get a
// direction of its own) while the dimension labels, which are later siblings of that group, stay on
// top of it. `pointerEvents: none` is not optional: on the workshop's touch panel an overlay that
// swallows taps would stop pieces being marked as cut.
const BoardGrain = ({ boardWidth, boardHeight }: BoardGrainProps) => {
  const lines = []
  let i = 0
  for (let at = GRAIN_STEP_MM; at < boardWidth; at += GRAIN_STEP_MM, i++) {
    const dashes = cycle(GRAIN_DASHES_MM, i)
    const period = dashes.reduce((sum, d) => sum + d, 0)
    lines.push({
      key: i,
      x: at + cycle(GRAIN_JITTER, i) * GRAIN_STEP_MM,
      width: GRAIN_STROKE_MM * cycle(GRAIN_WEIGHTS, i),
      dash: dashes.join(' '),
      offset: (i * 173) % period,
    })
  }

  return (
    <g stroke={GRAIN_COLOR} opacity={GRAIN_OPACITY} style={{ pointerEvents: 'none' }}>
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x}
          y1={0}
          x2={line.x}
          y2={boardHeight}
          strokeWidth={line.width}
          strokeDasharray={line.dash}
          strokeDashoffset={line.offset}
        />
      ))}
    </g>
  )
}

export default BoardGrain
