import { useId } from 'react'

import {
  EDGE_COLOR,
  bandedSides,
  clamp,
  pieceSig,
  sideLine,
} from 'src/features/optimizer/cutDrawing'
import type { CutBoard, CutPiece } from './types'

interface WorkshopBoardSvgProps {
  board: CutBoard
  colorFor: (sig: string) => string
  // Solo se puede tocar/marcar piezas con la orden en producción. En otros estados es solo-lectura.
  interactive: boolean
  onPieceTap: (piece: CutPiece) => void
}

const CHECK_COLOR = '#2b8a3e' // verde del ✓ de pieza cortada
const CUT_COLOR = '#1971c2' // azul del recorrido de la sierra

// Dibuja un tablero físico del plan de corte con la misma geometría que el optimizador, agregando el
// estado de corte por pieza (atenuada + ✓), los sobrantes rayados, los recorridos de la sierra y el
// área táctil sobre todo el rectángulo.
const WorkshopBoardSvg = ({ board, colorFor, interactive, onPieceTap }: WorkshopBoardSvgProps) => {
  const W = board.width
  const H = board.height
  const edgeWidth = clamp(Math.max(W, H) * 0.012, 8, 22)
  const rawId = useId()
  const wasteId = `waste-${rawId.replace(/:/g, '')}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        maxHeight: '72vh',
        touchAction: 'manipulation',
      }}
      role="img"
      aria-label={`Tablero ${board.sheetNumber}: ${W}×${H} con ${board.pieces.length} piezas`}
    >
      <defs>
        <pattern id={wasteId} patternUnits="userSpaceOnUse" width={48} height={48}>
          <rect width={48} height={48} fill="#f1f3f5" />
          <path d="M0,48 L48,0" stroke="#ced4da" strokeWidth={3} />
        </pattern>
      </defs>

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

      {/* Sobrantes / desperdicio (zonas libres rayadas, para distinguir pieza vs. sobrante) */}
      {(board.remainders ?? []).map((r, idx) => (
        <rect
          key={`rem-${idx}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          fill={`url(#${wasteId})`}
          stroke="#ced4da"
          strokeWidth={1}
          strokeDasharray="6 6"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Piezas */}
      {board.pieces.map((p) => {
        const sig = pieceSig(p)
        const color = colorFor(sig)
        const minSide = Math.min(p.width, p.height)
        const fontSize = clamp(minSide / 5, 22, 90)
        const checkSize = clamp(minSide * 0.55, 36, 220)
        const showText = p.width > 130 && p.height > 90
        const cx = p.x + p.width / 2
        const cy = p.y + p.height / 2

        return (
          <g
            key={p.id}
            role={interactive ? 'button' : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onClick={interactive ? () => onPieceTap(p) : undefined}
          >
            <title>
              {p.label} · {p.originalWidth}×{p.originalHeight} mm{p.rotated ? ' (rotada 90°)' : ''}
              {p.cut ? ' — cortada' : ''}
            </title>

            {/* Visual de la pieza: atenuado cuando ya está cortada */}
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

              {/* Tapacanto por lado geométrico */}
              {bandedSides(p).map((side) => {
                const l = sideLine(side, p.x, p.y, p.width, p.height)
                return (
                  <line
                    key={`${p.id}-${side}`}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke={EDGE_COLOR}
                    strokeWidth={edgeWidth}
                    strokeLinecap="round"
                  />
                )
              })}

              {showText && (
                <text
                  x={cx}
                  y={cy}
                  fontSize={fontSize}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#212529"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {p.originalWidth}×{p.originalHeight}
                  {p.rotated ? ' ↻' : ''}
                </text>
              )}
            </g>

            {/* ✓ a opacidad plena por encima del atenuado, para que la pieza cortada se lea de un vistazo */}
            {p.cut && (
              <text
                x={cx}
                y={cy}
                fontSize={checkSize}
                textAnchor="middle"
                dominantBaseline="central"
                fill={CHECK_COLOR}
                fontWeight={700}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                ✓
              </text>
            )}
          </g>
        )
      })}

      {/* Recorridos de la sierra (guillotina), por encima de las piezas. Doble trazo (casing blanco +
          punteado azul) para que se lean sobre cualquier color de pieza. "¿Por dónde paso la sierra?" */}
      {(board.cuts ?? []).map((c, idx) => {
        const x2 = c.isHorizontal ? c.x + c.length : c.x
        const y2 = c.isHorizontal ? c.y : c.y + c.length
        return (
          <g key={`cut-${idx}`} style={{ pointerEvents: 'none' }}>
            <line
              x1={c.x}
              y1={c.y}
              x2={x2}
              y2={y2}
              stroke="#ffffff"
              strokeWidth={4}
              strokeOpacity={0.85}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={c.x}
              y1={c.y}
              x2={x2}
              y2={y2}
              stroke={CUT_COLOR}
              strokeWidth={2}
              strokeDasharray="9 6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </svg>
  )
}

export default WorkshopBoardSvg
