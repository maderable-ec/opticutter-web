import { createLucideIcon } from 'lucide-react'

// The trade's own glyphs, drawn on Lucide's 24 grid with its round caps and joins, so they take the
// same stroke and size as every other icon. No icon set draws a board, an edge band or a saw blade.

// A board with its edge extruded, the same depth the isotype gives its three boards (`sygnet.ts`).
export const Board = createLucideIcon('board', [
  ['path', { d: 'M4 5H16.5V20H7A3 3 0 0 1 4 17Z', key: 'face' }],
  ['path', { d: 'M16.5 5L20 8.5V20H16.5', key: 'edge' }],
])

// A roll of edge band with the tape coming off it: the canteado activity and the banding products.
export const EdgeBand = createLucideIcon('edge-band', [
  ['circle', { cx: '9', cy: '10', r: '6', key: 'roll' }],
  ['circle', { cx: '9', cy: '10', r: '2', key: 'core' }],
  ['path', { d: 'M9 16H21V13.2H14', key: 'tape' }],
])

// A saw blade: eight hooked teeth and the arbor hole. The cutting activity.
export const SawBlade = createLucideIcon('saw-blade', [
  [
    'path',
    {
      d: 'M12 4.6L13.2 2.07L17.23 6.77L19.87 5.83L19.4 12L21.93 13.2L17.23 17.23L18.17 19.87L12 19.4L10.8 21.93L6.77 17.23L4.13 18.17L4.6 12L2.07 10.8L6.77 6.77L5.83 4.13Z',
      key: 'teeth',
    },
  ],
  ['circle', { cx: '12', cy: '12', r: '2.4', key: 'arbor' }],
])

// What is left of a board once a corner is cut away: the piece that left is dashed.
export const Offcut = createLucideIcon('offcut', [
  ['path', { d: 'M3 4H21V20H12V12H3Z', key: 'remnant' }],
  ['path', { d: 'M3 12V20H12', strokeDasharray: '1.6 2.4', key: 'gone' }],
])

// The grain on a sheet, with a knot.
export const Grain = createLucideIcon('grain', [
  ['rect', { x: '3', y: '4', width: '18', height: '16', rx: '2', key: 'sheet' }],
  ['path', { d: 'M3 9.5C6.5 8 8.5 11.5 12 10.5S17.5 7.5 21 9', key: 'line1' }],
  ['path', { d: 'M3 14.5C6 13.5 9 16.5 12.5 15S18 13 21 14.5', key: 'line2' }],
  ['ellipse', { cx: '15.5', cy: '12.6', rx: '1.6', ry: '.9', key: 'knot' }],
])

// A piece and the quarter turn it takes.
export const RotatePiece = createLucideIcon('rotate-piece', [
  ['rect', { x: '3.5', y: '9', width: '9', height: '12', rx: '1', key: 'piece' }],
  ['path', { d: 'M8 5A9 9 0 0 1 17 14', key: 'turn' }],
  ['path', { d: 'M14.6 12L17 14.4L19.4 12', key: 'head' }],
])

// A piece on the sheet and the place it is going to, dashed.
export const AdjustLayout = createLucideIcon('adjust-layout', [
  ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', key: 'sheet' }],
  ['rect', { x: '6.5', y: '6.5', width: '5', height: '5', rx: '.5', key: 'piece' }],
  [
    'rect',
    {
      x: '12.5',
      y: '12.5',
      width: '5',
      height: '5',
      rx: '.5',
      strokeDasharray: '1.5 1.8',
      key: 'to',
    },
  ],
])

// A guillotine cut plan: what the optimizer hands back.
export const CutPlan = createLucideIcon('cut-plan', [
  ['rect', { x: '3', y: '4', width: '18', height: '16', rx: '1.5', key: 'sheet' }],
  ['path', { d: 'M11 4V20M3 13H11M11 10H21M16 10V20', key: 'cuts' }],
])

// The same plan with a «+» at its foot, the way Lucide marks a new one (`calendar-plus`): the sheet
// opens where the «+» sits. «Cotizar» as the menu's button, the one that starts work.
export const CutPlanPlus = createLucideIcon('cut-plan-plus', [
  [
    'path',
    {
      d: 'M21 13V5.5A1.5 1.5 0 0 0 19.5 4H4.5A1.5 1.5 0 0 0 3 5.5V18.5A1.5 1.5 0 0 0 4.5 20H14.5',
      key: 'sheet',
    },
  ],
  ['path', { d: 'M11 4V20M3 13H11M11 10H21M14.5 10V20', key: 'cuts' }],
  ['path', { d: 'M19 16.5V21.5M16.5 19H21.5', key: 'plus' }],
])
