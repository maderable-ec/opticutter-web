import CantoPreview, { type CantoSides } from './CantoPreview'

// A cut list you can read on a phone: one card per piece, grouped by material. «Lateral ×2 /
// 720 × 560 mm / 1L1C CS BLANCO 19X0.45MM / Abis B2 · Ran R1» — the work order in the words the
// shop uses, where the table's eight columns scrolled sideways and put the canto off the screen.
//
// Presentational: each source (an order's frozen pieces, a quote's form) has its adapter that
// builds these groups (`orders/cutList.ts`, `optimizer/cutList.ts`), so both read alike.

// One tape on the piece, in the notation the seller typed («1L1C CS», «1C CD BLN»), and its name.
export interface CutListEdge {
  notation: string
  tape: string | null
}

export interface CutListPiece {
  key: string
  label: string
  height: number | string
  width: number | string
  quantity: number
  // Every banded side, auto and special alike, for the thumbnail.
  sides: CantoSides
  // The Canto column's own tape, on the sides no canto especial took; null when it has none.
  canto: CutListEdge | null
  // One per special tape.
  specials: CutListEdge[]
  // Workshop codes with their service («Abis B2 · Ran R1»); '' for none.
  codes: string
}

export interface CutListGroup {
  key: string
  // Null when the list has one group with no material of its own: a rubric over the whole list
  // would be a frame around nothing.
  name: string | null
  pieces: CutListPiece[]
  units: number
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

interface CutListCardsProps {
  groups: CutListGroup[]
  className?: string
}

const CutListCards = ({ groups, className = '' }: CutListCardsProps) => (
  <div className={`cut-list ${className}`}>
    {groups.map((group) => (
      <section key={group.key} className="cut-list__group">
        {group.name && (
          <div className="cut-list__head">
            <span className="fw-semibold">{group.name}</span>
            <span className="text-body-secondary small">
              {plural(group.pieces.length, 'pieza', 'piezas')} ·{' '}
              {plural(group.units, 'unidad', 'unidades')}
            </span>
          </div>
        )}
        <ul className="cut-list__pieces">
          {group.pieces.map((p) => {
            const edges = [...(p.canto ? [p.canto] : []), ...p.specials]
            return (
              <li key={p.key} className="cut-piece">
                <div className="cut-piece__head">
                  <strong className="cut-piece__label">
                    {p.label || <span className="fw-normal text-body-secondary">Sin etiqueta</span>}
                  </strong>
                  <strong className="cut-piece__qty">×{p.quantity}</strong>
                </div>
                <div className="cut-piece__dims">
                  {p.height} × {p.width} mm
                </div>
                {edges.length > 0 && (
                  <div className="cut-piece__edges">
                    <CantoPreview sides={p.sides} />
                    {/* One tape per line: the auto banding and a special one in a single run read
                        as one tape with two names. */}
                    <span className="d-flex flex-column">
                      {edges.map((e, k) => (
                        <span key={k}>
                          {e.notation}
                          {e.tape && <span className="text-body-secondary"> {e.tape}</span>}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                {p.codes && <div className="cut-piece__codes">{p.codes}</div>}
              </li>
            )
          })}
        </ul>
      </section>
    ))}
  </div>
)

export default CutListCards
