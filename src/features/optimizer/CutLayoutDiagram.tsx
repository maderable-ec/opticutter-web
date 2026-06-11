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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
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

const bandedSides = (p: PlacedPiece): EdgeSide[] =>
  p.edges ? (Object.keys(p.edges) as EdgeSide[]).filter((s) => p.edges?.[s]) : []

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
}

const SheetSvg = ({
  layout,
  colorFor,
  dimSig,
  highlightId,
  onPieceEnter,
  onPieceLeave,
  maxHeight = 420,
}: SheetSvgProps) => {
  const rawId = useId()
  const wasteId = `waste-${rawId.replace(/:/g, '')}`
  const { material, placedPieces, remainders, statistics } = layout
  const W = material.width
  const H = material.height
  const edgeWidth = clamp(Math.max(W, H) * 0.012, 8, 22)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
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
  const [hoverId, setHoverId] = useState<string | null>(null)
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
            <CCol xs={12} lg={6}>
              <SheetSvg
                layout={layout}
                colorFor={colorFor}
                highlightId={hoverId}
                onPieceEnter={(p) => setHoverId(p.pieceId)}
                onPieceLeave={() => setHoverId(null)}
                maxHeight={640}
              />
            </CCol>
            <CCol xs={12} lg={6}>
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

              <CTable small responsive className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary" style={{ width: 24 }} />
                    <CTableHeaderCell className="bg-body-tertiary">Medida (mm)</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Rot.
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Posición</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Tapacanto</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {layout.placedPieces.map((p) => {
                    const sides = bandedSides(p)
                    const active = hoverId === p.pieceId
                    return (
                      <CTableRow
                        key={p.pieceId}
                        onMouseEnter={() => setHoverId(p.pieceId)}
                        onMouseLeave={() => setHoverId(null)}
                        style={{
                          cursor: 'default',
                          background: active ? 'var(--cui-tertiary-bg)' : undefined,
                        }}
                      >
                        <CTableDataCell>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              borderRadius: 2,
                              background: colorFor(pieceSig(p)),
                            }}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-nowrap">
                          {p.originalWidth}×{p.originalHeight}
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          {p.rotated ? '↻' : '—'}
                        </CTableDataCell>
                        <CTableDataCell className="text-nowrap text-body-secondary">
                          {Math.round(p.x)}, {Math.round(p.y)}
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {sides.length ? sides.map((s) => SIDE_LABELS_ES[s]).join(', ') : '—'}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </CCol>
          </CRow>
        )}
      </CModalBody>
    </CModal>
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
  const { colorFor, legend } = useMemo(() => {
    const colors = new Map<string, string>()
    const counts = new Map<string, number>()
    for (const group of layoutGroups) {
      for (const p of group.layout.placedPieces) {
        const sig = pieceSig(p)
        if (!colors.has(sig)) colors.set(sig, PALETTE[colors.size % PALETTE.length])
        // Cada grupo representa `count` hojas físicas idénticas.
        counts.set(sig, (counts.get(sig) ?? 0) + group.count)
      }
    }
    return {
      colorFor: (sig: string) => colors.get(sig) ?? PALETTE[0],
      legend: [...colors.keys()].map((sig) => ({
        sig,
        color: colors.get(sig)!,
        count: counts.get(sig) ?? 0,
      })),
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
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong className="small text-body-secondary text-uppercase">Diagrama de cortes</strong>
        {legend.length > 0 && (
          <div className="d-flex flex-wrap gap-2 justify-content-end">
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
          </div>
        )}
      </div>

      <CRow className="g-3">
        {layoutGroups.map((group) => {
          const { material, statistics } = group.layout
          return (
            <CCol xs={12} md={6} xl={4} key={group.patternId}>
              <div className="border rounded p-2 h-100">
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
                    <div className="text-body-secondary">{materialName(group.materialKey)}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <CBadge color={statistics.efficiency >= 80 ? 'success' : 'warning'}>
                      {statistics.efficiency.toFixed(1)}%
                    </CBadge>
                    <CButton
                      size="sm"
                      color="secondary"
                      variant="ghost"
                      onClick={() => setDetail(group)}
                    >
                      Ampliar
                    </CButton>
                  </div>
                </div>

                <div
                  role="button"
                  title="Ampliar hoja"
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setDetail(group)}
                >
                  <SheetSvg
                    layout={group.layout}
                    colorFor={colorFor}
                    dimSig={hoveredSig}
                    onPieceEnter={(p) => setHoveredSig(pieceSig(p))}
                    onPieceLeave={() => setHoveredSig(null)}
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
            </CCol>
          )
        })}
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
