// Small SVG thumbnail of a piece's banded sides. Shared by the optimizer/quote piece table and the
// public review, so both render edge banding identically.
//
// The piece is displayed rotated 90° clockwise, so long sides (L = left/right of the piece) appear
// as horizontal bars top/bottom, and short sides (C = top/bottom) as vertical bars.
//
// `special` adds the sides a canto especial holds, dashed in the technical teal beside the Canto's
// solid orange: next to the Canto select the thumbnail then shows every banded side, which is why
// a `2L` there can be off. Only the despiece passes it; every other surface draws as it did.

export interface CantoSides {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

const SPECIAL = { stroke: 'var(--mb-tech)', strokeWidth: 2, strokeDasharray: '3 2' }

const CantoPreview = ({ sides, special }: { sides: CantoSides; special?: CantoSides }) => (
  <svg width="28" height="18" viewBox="0 0 28 18" style={{ flexShrink: 0 }}>
    <rect x="1" y="1" width="26" height="16" fill="none" stroke="#adb5bd" strokeWidth="1" />
    {sides.left && <line x1="1" y1="1" x2="27" y2="1" stroke="#d9480f" strokeWidth="2" />}
    {sides.right && <line x1="1" y1="17" x2="27" y2="17" stroke="#d9480f" strokeWidth="2" />}
    {sides.bottom && <line x1="1" y1="1" x2="1" y2="17" stroke="#d9480f" strokeWidth="2" />}
    {sides.top && <line x1="27" y1="1" x2="27" y2="17" stroke="#d9480f" strokeWidth="2" />}
    {special?.left && !sides.left && <line x1="1" y1="1" x2="27" y2="1" {...SPECIAL} />}
    {special?.right && !sides.right && <line x1="1" y1="17" x2="27" y2="17" {...SPECIAL} />}
    {special?.bottom && !sides.bottom && <line x1="1" y1="1" x2="1" y2="17" {...SPECIAL} />}
    {special?.top && !sides.top && <line x1="27" y1="1" x2="27" y2="17" {...SPECIAL} />}
  </svg>
)

export default CantoPreview
