// Small SVG thumbnail of a piece's banded sides. Shared by the optimizer/quote piece table and the
// public review, so both render edge banding identically.
//
// The thumbnail is always landscape, so the piece is laid with its long sides (L) as the horizontal
// bars and its short ones (C) as the vertical bars. Which pair is long is the piece's own
// (`longSides`, from `measures`): `left`/`right` when its height is the longer measure (the piece
// drawn turned 90° clockwise), `top`/`bottom` when its width is (drawn as it is). Without measures,
// `left`/`right` — the reading of a square piece.
//
// `special` adds the sides a canto especial holds, dashed in the technical teal beside the Canto's
// solid orange: next to the Canto select the thumbnail then shows every banded side, which is why
// a `2L` there can be off. Only the despiece passes it; every other surface draws as it did.

import { widthIsLonger, type PieceMeasures } from 'src/shared/utils/specialEdges'

export interface CantoSides {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

type Side = keyof CantoSides

const SPECIAL = { stroke: 'var(--mb-tech)', strokeWidth: 2, strokeDasharray: '3 2' }

// The thumbnail's four bars: the two horizontal ones (the long sides) and the two vertical ones.
const BARS = {
  north: { x1: 1, y1: 1, x2: 27, y2: 1 },
  south: { x1: 1, y1: 17, x2: 27, y2: 17 },
  west: { x1: 1, y1: 1, x2: 1, y2: 17 },
  east: { x1: 27, y1: 1, x2: 27, y2: 17 },
}

// Turned 90° clockwise, so the height lies along the thumbnail's length; or as it is.
const TURNED: Record<Side, keyof typeof BARS> = {
  left: 'north',
  right: 'south',
  bottom: 'west',
  top: 'east',
}
const AS_IT_IS: Record<Side, keyof typeof BARS> = {
  top: 'north',
  bottom: 'south',
  left: 'west',
  right: 'east',
}
const SIDES: Side[] = ['left', 'right', 'bottom', 'top']

const CantoPreview = ({
  sides,
  special,
  measures,
}: {
  sides: CantoSides
  special?: CantoSides
  measures?: PieceMeasures | null
}) => {
  const bar = widthIsLonger(measures) ? AS_IT_IS : TURNED
  return (
    <svg width="28" height="18" viewBox="0 0 28 18" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="26" height="16" fill="none" stroke="#adb5bd" strokeWidth="1" />
      {SIDES.filter((s) => sides[s]).map((s) => (
        <line key={s} {...BARS[bar[s]]} stroke="#d9480f" strokeWidth="2" />
      ))}
      {SIDES.filter((s) => special?.[s] && !sides[s]).map((s) => (
        <line key={`special-${s}`} {...BARS[bar[s]]} {...SPECIAL} />
      ))}
    </svg>
  )
}

export default CantoPreview
