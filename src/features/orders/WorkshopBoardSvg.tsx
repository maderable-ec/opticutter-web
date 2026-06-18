import { useId } from 'react'

import {
  EDGE_COLOR,
  bandedSides,
  clamp,
  insetSideLine,
  pieceSig,
} from 'src/features/optimizer/cutDrawing'
import useZoomPan from 'src/shared/hooks/useZoomPan'
import ZoomControls from 'src/shared/components/ZoomControls'
import type { CutBoard, CutPiece } from './types'

interface WorkshopBoardSvgProps {
  board: CutBoard
  colorFor: (sig: string) => string
  // Solo se puede tocar/marcar piezas con la orden en producción. En otros estados es solo-lectura.
  interactive: boolean
  onPieceTap: (piece: CutPiece) => void
}

const CHECK_COLOR = '#2b8a3e' // verde del ✓ de pieza cortada

// Dibuja un tablero físico del plan de corte con la misma geometría que el optimizador, agregando el
// estado de corte por pieza (atenuada + ✓), los sobrantes rayados y el área táctil sobre todo el
// rectángulo.
const WorkshopBoardSvg = ({ board, colorFor, interactive, onPieceTap }: WorkshopBoardSvgProps) => {
  const W = board.width
  const H = board.height
  const edgeWidth = clamp(Math.max(W, H) * 0.012, 8, 22)
  const rawId = useId()
  const wasteId = `waste-${rawId.replace(/:/g, '')}`

  // Zoom para inspeccionar/tocar piezas pequeñas. doubleClickZoom apagado: el doble toque no debe
  // interferir con "tocar = marcar cortada".
  const { svgRef, groupTransform, scale, isZoomed, zoomIn, zoomOut, reset } = useZoomPan({
    doubleClickZoom: false,
  })

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          maxHeight: '72vh',
          // Sin zoom: deja el scroll vertical de la página al navegador (pinch sigue siendo nuestro).
          // Con zoom: tomamos el control total para desplazar el diagrama con un dedo.
          touchAction: isZoomed ? 'none' : 'pan-y',
          cursor: isZoomed ? 'grab' : undefined,
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

        <g transform={groupTransform}>
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
            // Al acercar, las piezas pequeñas revelan su medida (umbral según escala efectiva).
            const showText = p.width * scale > 130 && p.height * scale > 90
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
                  {p.label} · {p.originalWidth}×{p.originalHeight} mm
                  {p.rotated ? ' (rotada 90°)' : ''}
                  {p.cut ? ' — cortada' : ''}
                  {p.cut && p.cutByLabel ? ` por ${p.cutByLabel}` : ''}
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

                  {/* Tapacanto: banda gruesa hacia dentro de la pieza (no pisa la línea de corte) */}
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
        </g>
      </svg>
      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset} isZoomed={isZoomed} />
    </div>
  )
}

export default WorkshopBoardSvg
