import type { LeftoverDirection } from '../types'

// The server names an offcut's growth in the SHEET's axes: `x` along its width, `y` along its height
// (the largo). Every sheet is drawn turned 90° clockwise (`boardRotation`: a point (x, y) lands at
// (H − y, x) on screen), so growing along +y moves LEFT on screen and +x moves DOWN. This table is
// the one place that knows it; get it backwards and the arrow points away from the offcut it grows.
export const DIRECTION_LABELS: Record<LeftoverDirection, { arrow: string; label: string }> = {
  'y+': { arrow: '←', label: 'Extender a la izquierda' },
  'y-': { arrow: '→', label: 'Extender a la derecha' },
  'x-': { arrow: '↑', label: 'Extender hacia arriba' },
  'x+': { arrow: '↓', label: 'Extender hacia abajo' },
}
