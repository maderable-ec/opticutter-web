import Icon from 'src/shared/icons/Icon'

import CantoPreview from 'src/shared/components/CantoPreview'
import type { EdgeBandingProduct } from 'src/features/products/types'
import type { RequirementForm } from './optimizerForm'
import { isRequirementEmpty, needsBandingProduct } from './optimizerForm'
import { pieceReadout } from './pieceFields'

// The pieces of one material on a phone: a list to read, where the grid (`PieceRowsTable`) is a
// sheet to type in. Thirteen columns do not fit 390px, and scrolling a grid sideways to find which
// row is the «Lateral» is not reading. Each piece is one tap target that opens `PieceEditSheet`.
//
// Mounted beside the grid, and the breakpoint picks (`d-md-none` at the call site). It carries the
// same `data-piece-flat` as the grid's rows so the search, «Fila #3» and «siguiente incompleta»
// reach it: `revealPiece` scrolls to whichever of the two is on screen. Like the grid, it paints
// search hits and never filters — every index here is positional.

interface PiecesMobileListProps {
  rows: RequirementForm[]
  // Flat index of this group's first row.
  startIndex: number
  materialValid: boolean
  // Every tapacanto a row might name, to read its band type off the assigned tape.
  byId: Map<string, EdgeBandingProduct>
  matches?: Set<number>
  activeMatch?: number | null
  onOpen: (flat: number) => void
}

const PiecesMobileList = ({
  rows,
  startIndex,
  materialValid,
  byId,
  matches,
  activeMatch,
  onOpen,
}: PiecesMobileListProps) => {
  if (rows.length === 0) {
    return (
      <div className="text-center text-body-secondary small py-3">
        Sin piezas en este material. Agrégalas con la entrada rápida.
      </div>
    )
  }

  return (
    <ul className="piece-list">
      {rows.map((req, local) => {
        const flat = startIndex + local
        const r = pieceReadout(req, byId)
        const incomplete =
          !isRequirementEmpty(req) &&
          !(materialValid && Number(req.height) > 0 && Number(req.width) > 0 && r.quantity)
        const bandingMissing = needsBandingProduct(req)
        const hit = activeMatch === flat ? ' is-active-hit' : matches?.has(flat) ? ' is-hit' : ''
        return (
          <li key={flat}>
            <button
              type="button"
              className={`piece-row${hit}${incomplete || bandingMissing ? ' is-error' : ''}`}
              data-piece-flat={flat}
              aria-haspopup="dialog"
              onClick={() => onOpen(flat)}
            >
              <span className="piece-row__num">#{flat + 1}</span>
              <span className="piece-row__body">
                <span className="piece-row__title">
                  {r.label || <span className="text-body-secondary fw-normal">Sin etiqueta</span>}
                </span>
                <span className="piece-row__dims">
                  {r.dims ? `${r.dims} mm` : 'Sin medidas'}
                  {r.quantity != null && <strong> · ×{r.quantity}</strong>}
                </span>
                {/* Its own line, whole: beside the final size it broke in the middle of a measure. */}
                {r.cutDims && (
                  <span className="small text-tech text-nowrap">✂ corte {r.cutDims} mm</span>
                )}
                {(r.canto || r.specialTapes > 0 || r.codes || incomplete || bandingMissing) && (
                  <span className="piece-row__chips">
                    {incomplete && (
                      <span className="badge status-pill status-pill--danger">
                        <Icon name="warning" className="status-pill__icon" />
                        Incompleta
                      </span>
                    )}
                    {bandingMissing && (
                      <span className="badge status-pill status-pill--danger">
                        <Icon name="warning" className="status-pill__icon" />
                        Falta tapacanto
                      </span>
                    )}
                    {r.canto && (
                      <span className="badge status-pill status-pill--neutral">
                        <CantoPreview sides={req.edgeBanding.sides} />
                        {r.canto}
                      </span>
                    )}
                    {r.specialTapes > 0 && (
                      <span className="badge status-pill status-pill--neutral">
                        +{r.specialTapes} {r.specialTapes === 1 ? 'especial' : 'especiales'}
                      </span>
                    )}
                    {r.codes && <span className="piece-row__codes">{r.codes}</span>}
                  </span>
                )}
              </span>
              <Icon name="chevronRight" className="piece-row__chevron" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default PiecesMobileList
