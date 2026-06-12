import { useId, useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CCol,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'

import type { EdgeSide, Layout, LayoutGroup, MaterialSummary, PlacedPiece } from './types'

// Paleta estable para colorear piezas por dimensión (firma). Colores tipo Tableau, legibles.
const PALETTE = [
  '#4e79a7',
  '#59a14f',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#b07aa1',
  '#edc948',
  '#ff9da7',
  '#9c755f',
  '#86bcb6',
]

const EDGE_COLOR = '#d9480f' // color del tapacanto en el diagrama

const SIDE_LABELS_ES: Record<EdgeSide, string> = {
  top: 'Superior',
  bottom: 'Inferior',
  left: 'Izquierdo',
  right: 'Derecho',
}

// Las piezas iguales comparten dimensiones nominales (originalWidth×originalHeight).
const pieceSig = (p: PlacedPiece) => `${p.originalWidth}×${p.originalHeight}`

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const bandedSides = (p: PlacedPiece): EdgeSide[] => p.edges?.sides ?? []

interface SideLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

// Coordenadas del lado geométrico de un rect (x,y,w,h). Los edges de la respuesta ya son geométricos.
const sideLine = (side: EdgeSide, x: number, y: number, w: number, h: number): SideLine => {
  switch (side) {
    case 'top':
      return { x1: x, y1: y, x2: x + w, y2: y }
    case 'bottom':
      return { x1: x, y1: y + h, x2: x + w, y2: y + h }
    case 'left':
      return { x1: x, y1: y, x2: x, y2: y + h }
    case 'right':
      return { x1: x + w, y1: y, x2: x + w, y2: y + h }
  }
}

// --- SVG reutilizable de una hoja (se usa en la tarjeta pequeña y ampliado en el modal) ---

interface SheetSvgProps {
  layout: Layout
  colorFor: (sig: string) => string
  dimSig?: string | null
  highlightId?: string | null
  onPieceEnter?: (p: PlacedPiece) => void
  onPieceLeave?: () => void
  maxHeight?: number
  // Muestra las medidas del tablero (ancho arriba, alto a la izquierda). Solo en la vista ampliada.
  showDimensions?: boolean
}

const SheetSvg = ({
  layout,
  colorFor,
  dimSig,
  highlightId,
  onPieceEnter,
  onPieceLeave,
  maxHeight = 420,
  showDimensions = false,
}: SheetSvgProps) => {
  const rawId = useId()
  const wasteId = `waste-${rawId.replace(/:/g, '')}`
  const { material, placedPieces, remainders, statistics } = layout
  const W = material.width
  const H = material.height
  const edgeWidth = clamp(Math.max(W, H) * 0.012, 8, 22)

  // Margen reservado para las etiquetas de medida del tablero (solo vista ampliada).
  const margin = showDimensions ? Math.max(W, H) * 0.07 : 0
  const labelSize = clamp(Math.max(W, H) * 0.028, 16, 44)

  return (
    <svg
      viewBox={`${-margin} ${-margin} ${W + margin} ${H + margin}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block', maxHeight }}
      role="img"
      aria-label={`Hoja ${material.width}×${material.height} con ${statistics.piecesCount} piezas`}
    >
      <defs>
        <pattern id={wasteId} patternUnits="userSpaceOnUse" width={48} height={48}>
          <rect width={48} height={48} fill="#f1f3f5" />
          <path d="M0,48 L48,0" stroke="#ced4da" strokeWidth={3} />
        </pattern>
      </defs>

      {/* Medidas del tablero */}
      {showDimensions && (
        <g fill="#868e96" style={{ userSelect: 'none' }}>
          <text
            x={W / 2}
            y={-margin / 2}
            fontSize={labelSize}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {W} mm
          </text>
          <text
            x={-margin / 2}
            y={H / 2}
            fontSize={labelSize}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(-90 ${-margin / 2} ${H / 2})`}
          >
            {H} mm
          </text>
        </g>
      )}

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

      {/* Sobrantes / desperdicio */}
      {remainders.map((r, idx) => (
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
      {placedPieces.map((p) => {
        const sig = pieceSig(p)
        const color = colorFor(sig)
        const dimmed =
          highlightId != null ? p.pieceId !== highlightId : dimSig != null && sig !== dimSig
        const minSide = Math.min(p.width, p.height)
        const fontSize = clamp(minSide / 5, 22, 90)
        const showText = p.width > 130 && p.height > 90

        return (
          <g
            key={p.pieceId}
            opacity={dimmed ? 0.35 : 1}
            onMouseEnter={() => onPieceEnter?.(p)}
            onMouseLeave={() => onPieceLeave?.()}
            style={{ cursor: 'default' }}
          >
            <title>
              {p.originalWidth}×{p.originalHeight} mm{p.rotated ? ' (rotada 90°)' : ''}
            </title>
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
                  key={`${p.pieceId}-${side}`}
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
                x={p.x + p.width / 2}
                y={p.y + p.height / 2}
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
        )
      })}
    </svg>
  )
}

// --- Ampliación de una sola pieza (panel de detalle del modal) ---

interface PiecePreviewProps {
  piece: PlacedPiece
  colorFor: (sig: string) => string
}

// Línea de tapacanto paralela al lado pero desplazada hacia afuera, para no montarse sobre la pieza.
const bandLine = (side: EdgeSide, w: number, h: number, gap: number, inset: number): SideLine => {
  switch (side) {
    case 'top':
      return { x1: inset, y1: -gap, x2: w - inset, y2: -gap }
    case 'bottom':
      return { x1: inset, y1: h + gap, x2: w - inset, y2: h + gap }
    case 'left':
      return { x1: -gap, y1: inset, x2: -gap, y2: h - inset }
    case 'right':
      return { x1: w + gap, y1: inset, x2: w + gap, y2: h - inset }
  }
}

// Render aislado de la pieza: medidas dentro (ancho abajo, alto a la izquierda),
// notación de cantos al centro y el tapacanto como barras offset.
const PiecePreview = ({ piece, colorFor }: PiecePreviewProps) => {
  const w = piece.width
  const h = piece.height
  const color = colorFor(pieceSig(piece))
  const maxDim = Math.max(w, h)
  const minDim = Math.min(w, h)

  // Tapacanto como barra fina separada del borde por un gap; `pad` agranda el viewBox para que quepa.
  const bar = clamp(maxDim * 0.018, 4, 12)
  const gap = clamp(maxDim * 0.045, 8, 26)
  const inset = bar * 1.5
  const pad = gap + bar

  const dimSize = clamp(minDim * 0.12, 14, 56) // medidas dentro de la pieza
  const noteSize = clamp(minDim * 0.1, 14, 44) // notación central
  const dimInset = dimSize * 0.95 // separación de la medida respecto al borde

  const notation = piece.edges?.notation ?? ''

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 180, display: 'block' }}
      role="img"
      aria-label={`Pieza ${piece.originalWidth}×${piece.originalHeight} mm`}
    >
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={color}
        fillOpacity={0.85}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Tapacanto */}
      {bandedSides(piece).map((side) => {
        const l = bandLine(side, w, h, gap, inset)
        return (
          <line
            key={side}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={EDGE_COLOR}
            strokeWidth={bar}
            strokeLinecap="round"
          />
        )
      })}

      {/* Medidas dentro de la pieza: ancho abajo, alto a la izquierda */}
      <g fill="#212529" style={{ userSelect: 'none', pointerEvents: 'none' }}>
        <text
          x={w / 2}
          y={h - dimInset}
          fontSize={dimSize}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {Math.round(w)}
        </text>
        <text
          x={dimInset}
          y={h / 2}
          fontSize={dimSize}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(-90 ${dimInset} ${h / 2})`}
        >
          {Math.round(h)}
        </text>
      </g>

      {/* Notación de cantos al centro */}
      {notation && (
        <text
          x={w / 2}
          y={h / 2}
          fontSize={noteSize}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#212529"
          fontWeight={600}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {notation}
        </text>
      )}
    </svg>
  )
}

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
    <span className="text-body-secondary small">{label}</span>
    <span className="small fw-semibold text-end">{value}</span>
  </div>
)

interface PieceDetailCardProps {
  piece: PlacedPiece | null
  colorFor: (sig: string) => string
}

// Panel que reemplaza a la tabla por pieza: muestra la pieza bajo el cursor con todos sus datos.
const PieceDetailCard = ({ piece, colorFor }: PieceDetailCardProps) => {
  const sides = piece ? bandedSides(piece) : []
  return (
    <div className="border rounded p-2 mb-3">
      <div className="text-body-secondary small text-uppercase fw-semibold mb-2">
        Detalle de pieza
      </div>
      {piece ? (
        <>
          <PiecePreview piece={piece} colorFor={colorFor} />
          <div className="mt-2">
            <Detail
              label="Medida nominal"
              value={`${piece.originalWidth}×${piece.originalHeight} mm`}
            />
            {piece.rotated && (
              <Detail
                label="En hoja"
                value={`${Math.round(piece.width)}×${Math.round(piece.height)} mm`}
              />
            )}
            <Detail label="Rotación" value={piece.rotated ? 'Rotada 90° ↻' : 'Sin rotar'} />
            <Detail
              label="Posición (x, y)"
              value={`${Math.round(piece.x)}, ${Math.round(piece.y)} mm`}
            />
            <Detail
              label="Tapacanto"
              value={
                piece.edges
                  ? sides.map((s) => SIDE_LABELS_ES[s]).join(', ') || '—'
                  : 'Sin tapacanto'
              }
            />
            {piece.edges && (
              <Detail
                label="Material canto"
                value={
                  [piece.edges.code, piece.edges.color, piece.edges.notation]
                    .filter(Boolean)
                    .join(' · ') || '—'
                }
              />
            )}
          </div>
        </>
      ) : (
        <div
          className="d-flex align-items-center justify-content-center text-body-secondary small text-center px-3"
          style={{ height: 180 }}
        >
          Pasá el cursor sobre una pieza del diagrama para ver su detalle.
        </div>
      )}
    </div>
  )
}

// --- Resumen de piezas agrupadas por medida (acotado, no crece con la cantidad de piezas) ---

interface GroupedPiecesListProps {
  pieces: PlacedPiece[]
  colorFor: (sig: string) => string
  hoverSig: string | null
  onHover: (sig: string | null) => void
}

const GroupedPiecesList = ({ pieces, colorFor, hoverSig, onHover }: GroupedPiecesListProps) => {
  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of pieces) {
      const sig = pieceSig(p)
      counts.set(sig, (counts.get(sig) ?? 0) + 1)
    }
    return [...counts.entries()].map(([sig, count]) => ({ sig, count }))
  }, [pieces])

  return (
    <div>
      <div className="text-body-secondary small text-uppercase fw-semibold mb-2">
        Piezas por medida
      </div>
      <div className="d-flex flex-column gap-1">
        {groups.map(({ sig, count }) => (
          <div
            key={sig}
            className="d-flex align-items-center gap-2 px-2 py-1 rounded"
            style={{
              cursor: 'default',
              background: hoverSig === sig ? 'var(--cui-tertiary-bg)' : undefined,
              opacity: hoverSig && hoverSig !== sig ? 0.45 : 1,
            }}
            onMouseEnter={() => onHover(sig)}
            onMouseLeave={() => onHover(null)}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: colorFor(sig),
                display: 'inline-block',
              }}
            />
            <span className="small">{sig} mm</span>
            <span className="small text-body-secondary ms-auto">×{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Modal de detalle de una hoja ---

interface SheetDetailModalProps {
  group: LayoutGroup | null
  materialName: string
  colorFor: (sig: string) => string
  onClose: () => void
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <CCol xs={4}>
    <div className="text-body-secondary small">{label}</div>
    <div className="fw-semibold">{value}</div>
  </CCol>
)

const SheetDetailModal = ({ group, materialName, colorFor, onClose }: SheetDetailModalProps) => {
  const [hoverPiece, setHoverPiece] = useState<PlacedPiece | null>(null)
  const [hoverSig, setHoverSig] = useState<string | null>(null)
  const layout = group?.layout
  const stats = layout?.statistics

  return (
    <CModal visible={!!group} onClose={onClose} size="xl" scrollable alignment="center">
      <CModalHeader>
        <CModalTitle>
          {group ? `Patrón ${group.patternId}` : ''}
          {group && group.count > 1 ? ` · ×${group.count} hojas` : ''}
          {materialName ? ` · ${materialName}` : ''}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {layout && stats && (
          <CRow className="g-3">
            <CCol
              xs={12}
              lg={7}
              className="align-self-start"
              style={{ position: 'sticky', top: 0, zIndex: 1 }}
            >
              <SheetSvg
                layout={layout}
                colorFor={colorFor}
                highlightId={hoverPiece?.pieceId ?? null}
                dimSig={hoverSig}
                onPieceEnter={(p) => {
                  setHoverPiece(p)
                  setHoverSig(null)
                }}
                onPieceLeave={() => setHoverPiece(null)}
                maxHeight={640}
                showDimensions
              />
            </CCol>
            <CCol xs={12} lg={5}>
              <CRow className="g-2 mb-3">
                <Stat label="Eficiencia" value={`${stats.efficiency.toFixed(1)}%`} />
                <Stat label="Piezas" value={stats.piecesCount} />
                <Stat
                  label="Medida hoja"
                  value={`${layout.material.width}×${layout.material.height}`}
                />
                <Stat label="Corte lineal" value={`${stats.cutLinearM.toFixed(2)} m`} />
                <Stat label="Tapacanto" value={`${stats.edgeBandingLinearM.toFixed(2)} m`} />
                <Stat label="Desperdicio" value={`${(stats.wasteArea / 1e6).toFixed(2)} m²`} />
              </CRow>

              <PieceDetailCard piece={hoverPiece} colorFor={colorFor} />

              <GroupedPiecesList
                pieces={layout.placedPieces}
                colorFor={colorFor}
                hoverSig={hoverSig}
                onHover={setHoverSig}
              />
            </CCol>
          </CRow>
        )}
      </CModalBody>
    </CModal>
  )
}

// --- Tarjeta de un patrón en la grilla ---

interface PatternCardProps {
  group: LayoutGroup
  colorFor: (sig: string) => string
  hoveredSig: string | null
  setHoveredSig: (sig: string | null) => void
  materialName: string
  onOpen: () => void
}

const PatternCard = ({
  group,
  colorFor,
  hoveredSig,
  setHoveredSig,
  materialName,
  onOpen,
}: PatternCardProps) => {
  const [hover, setHover] = useState(false)
  const { material, statistics } = group.layout
  const efficiencyOk = statistics.efficiency >= 80

  return (
    <div
      className="border rounded p-2 h-100"
      style={{
        transition: 'border-color .15s, box-shadow .15s',
        borderColor: hover ? 'var(--cui-primary)' : undefined,
        boxShadow: hover ? '0 0 0 .15rem rgba(var(--cui-primary-rgb), .15)' : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
        <div className="small">
          <div className="fw-semibold">
            Patrón {group.patternId}
            {group.count > 1 && (
              <CBadge color="secondary" className="ms-1">
                ×{group.count}
              </CBadge>
            )}
          </div>
          <div className="text-body-secondary">{materialName}</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <CBadge color={efficiencyOk ? 'success' : 'warning'}>
            {statistics.efficiency.toFixed(1)}%
          </CBadge>
          <CButton size="sm" color="secondary" variant="ghost" onClick={onOpen}>
            Ampliar
          </CButton>
        </div>
      </div>

      <div role="button" title="Ampliar hoja" style={{ cursor: 'zoom-in' }} onClick={onOpen}>
        <SheetSvg
          layout={group.layout}
          colorFor={colorFor}
          dimSig={hoveredSig}
          onPieceEnter={(p) => setHoveredSig(pieceSig(p))}
          onPieceLeave={() => setHoveredSig(null)}
        />
      </div>

      {/* Barra de eficiencia */}
      <div
        className="mt-2"
        style={{
          height: 4,
          borderRadius: 2,
          background: 'var(--cui-tertiary-bg)',
          overflow: 'hidden',
        }}
        title={`Eficiencia ${statistics.efficiency.toFixed(1)}%`}
      >
        <div
          style={{
            width: `${clamp(statistics.efficiency, 0, 100)}%`,
            height: '100%',
            background: efficiencyOk ? 'var(--cui-success)' : 'var(--cui-warning)',
          }}
        />
      </div>

      <div className="d-flex flex-wrap gap-3 mt-2 small text-body-secondary">
        <span>
          {material.width}×{material.height} mm
        </span>
        <span>{statistics.piecesCount} piezas</span>
        <span>Corte {statistics.cutLinearM.toFixed(2)} m</span>
        {statistics.edgeBandingLinearM > 0 && (
          <span>Tapacanto {statistics.edgeBandingLinearM.toFixed(2)} m</span>
        )}
      </div>
    </div>
  )
}

// --- Diagrama principal ---

interface CutLayoutDiagramProps {
  layoutGroups: LayoutGroup[]
  materialsSummary: MaterialSummary[]
}

const CutLayoutDiagram = ({ layoutGroups, materialsSummary }: CutLayoutDiagramProps) => {
  const [hoveredSig, setHoveredSig] = useState<string | null>(null)
  const [detail, setDetail] = useState<LayoutGroup | null>(null)

  // Color estable por firma (orden de primera aparición) + conteo total para la leyenda.
  const { colorFor, legend, hasEdgeBanding } = useMemo(() => {
    const colors = new Map<string, string>()
    const counts = new Map<string, number>()
    let banding = false
    for (const group of layoutGroups) {
      for (const p of group.layout.placedPieces) {
        const sig = pieceSig(p)
        if (!colors.has(sig)) colors.set(sig, PALETTE[colors.size % PALETTE.length])
        // Cada grupo representa `count` hojas físicas idénticas.
        counts.set(sig, (counts.get(sig) ?? 0) + group.count)
        if (bandedSides(p).length > 0) banding = true
      }
    }
    return {
      colorFor: (sig: string) => colors.get(sig) ?? PALETTE[0],
      legend: [...colors.keys()].map((sig) => ({
        sig,
        color: colors.get(sig)!,
        count: counts.get(sig) ?? 0,
      })),
      hasEdgeBanding: banding,
    }
  }, [layoutGroups])

  const materialName = (materialKey: string) => {
    const m = materialsSummary.find((x) => x.materialKey === materialKey)
    if (!m) return materialKey
    return m.productName ?? m.productCode ?? `${m.width}×${m.height}×${m.thickness} mm`
  }

  if (!layoutGroups.length) return null

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
        <strong className="small text-body-secondary text-uppercase">Diagrama de cortes</strong>
        {(legend.length > 0 || hasEdgeBanding) && (
          <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
            {legend.map((l) => (
              <span
                key={l.sig}
                role="button"
                className="d-inline-flex align-items-center gap-1 small"
                style={{ opacity: hoveredSig && hoveredSig !== l.sig ? 0.4 : 1, cursor: 'default' }}
                onMouseEnter={() => setHoveredSig(l.sig)}
                onMouseLeave={() => setHoveredSig(null)}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: l.color,
                    display: 'inline-block',
                  }}
                />
                {l.sig} mm
                <span className="text-body-secondary">×{l.count}</span>
              </span>
            ))}
            {hasEdgeBanding && (
              <span className="d-inline-flex align-items-center gap-1 small text-body-secondary">
                <span
                  style={{
                    width: 16,
                    height: 4,
                    borderRadius: 2,
                    background: EDGE_COLOR,
                    display: 'inline-block',
                  }}
                />
                Tapacanto
              </span>
            )}
          </div>
        )}
      </div>

      <CRow className="g-3">
        {layoutGroups.map((group) => (
          <CCol xs={12} md={6} xl={4} key={group.patternId}>
            <PatternCard
              group={group}
              colorFor={colorFor}
              hoveredSig={hoveredSig}
              setHoveredSig={setHoveredSig}
              materialName={materialName(group.materialKey)}
              onOpen={() => setDetail(group)}
            />
          </CCol>
        ))}
      </CRow>

      <SheetDetailModal
        group={detail}
        materialName={detail ? materialName(detail.materialKey) : ''}
        colorFor={colorFor}
        onClose={() => setDetail(null)}
      />
    </div>
  )
}

export default CutLayoutDiagram
