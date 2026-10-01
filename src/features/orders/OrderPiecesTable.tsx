import { Fragment, type CSSProperties } from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import CantoPreview from 'src/shared/components/CantoPreview'
import CutListCards from 'src/shared/components/CutListCards'
import { hasWorkshopCodes, workshopCodesLine } from 'src/shared/utils/workshopCodes'
import { groupByMaterial, isUnnamed, orderCutList, pieceEdges } from './cutList'
import type { OrderPiece } from './types'

// The cut list an order was created with, read-only: unlike a quote, a confirmed order's despiece
// is frozen. Bare, like the two billing tables — the detail page mounts it inside a full-screen
// panel. Below `md` it is the cards instead (`CutListCards`), from the same reading
// (`cutList.ts`): eight columns scrolled sideways on a phone and put the canto off the screen.
//
// Sticky header rather than none: the panel exists precisely because this list can run to hundreds
// of rows. Same treatment as `PieceRowsTable`'s `thStyle`, minus its `background` override — the
// `.summary-table` header already paints an opaque fill of its own, and setting one here would
// paint over the brand tint.
const stickyHead: CSSProperties = { position: 'sticky', top: 0, zIndex: 2 }

const BASE_COLUMNS = 7

interface OrderPiecesTableProps {
  pieces: OrderPiece[]
  /**
   * Edge-banding product id → its name, built by the caller from the order's banding lines.
   * The piece's `edges` carries only the product's id (it is the frozen requirement spec, not a
   * resolved product), so the tape can be named without a second request — the order already
   * bills every tape it uses.
   */
  bandingNames?: Map<number, string>
  // Scroll box for the rows. The panel hands it the dialog's height so a long list scrolls inside
  // the dialog rather than inside a short box with the rest of the screen left empty.
  maxHeight?: string
}

const OrderPiecesTable = ({ pieces, bandingNames, maxHeight }: OrderPiecesTableProps) => {
  if (pieces.length === 0) return null

  // Grouped rather than carrying a "Material" column on every row: a real order runs to a couple of
  // hundred pieces and repeating the board's catalogue name on each one is the version of this
  // table nobody reads. It is also the language the optimizer's own despiece uses.
  const groups = groupByMaterial(pieces)
  const named = !isUnnamed(groups)
  // "Taller" only when some piece carries a workshop code — the same rule the printed ORDEN DE
  // PEDIDO follows, so an order without that work keeps the table it always had.
  const withWorkshop = pieces.some(hasWorkshopCodes)
  const columns = BASE_COLUMNS + (withWorkshop ? 1 : 0)

  return (
    <>
      <CutListCards className="d-md-none" groups={orderCutList(pieces, bandingNames)} />
      <div className="d-none d-md-block" style={{ maxHeight, overflow: 'auto' }}>
        <CTable small responsive hover className="summary-table mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={stickyHead}>Etiqueta</CTableHeaderCell>
              <CTableHeaderCell style={stickyHead} className="text-end">
                Largo (mm)
              </CTableHeaderCell>
              <CTableHeaderCell style={stickyHead} className="text-end">
                Ancho (mm)
              </CTableHeaderCell>
              <CTableHeaderCell style={stickyHead} className="text-end">
                Cant.
              </CTableHeaderCell>
              <CTableHeaderCell style={stickyHead}>Cantos</CTableHeaderCell>
              {withWorkshop && (
                <CTableHeaderCell
                  style={stickyHead}
                  title="Abisagrado (Abis), ranurado (Ran), ensamble (Ens) y división (Div)"
                >
                  Taller
                </CTableHeaderCell>
              )}
              <CTableHeaderCell style={stickyHead} className="text-end">
                Prioridad
              </CTableHeaderCell>
              <CTableHeaderCell style={stickyHead} className="text-center">
                Puede rotar
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {groups.map((group) => (
              // Fragment per group rather than a tbody each: one `<tbody>` keeps the zebra and the
              // hover continuous across the whole list. It needs its own key like any list child —
              // a bare `<>` in a map is exactly the shape React warns about.
              <Fragment key={group.key}>
                {named && (
                  <CTableRow className="table-active">
                    <CTableDataCell colSpan={columns}>
                      <span className="fw-semibold">{group.name}</span>
                      <span className="text-body-secondary ms-2">
                        {group.pieces.length} {group.pieces.length === 1 ? 'pieza' : 'piezas'} ·{' '}
                        {group.units} {group.units === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </CTableDataCell>
                  </CTableRow>
                )}
                {group.pieces.map((p, i) => {
                  const { sides, canto, specials } = pieceEdges(p.edges, bandingNames)
                  return (
                    // `OrderPiece.id` is optional in the API contract, and the index is stable
                    // here: the list is read-only and never reordered.
                    <CTableRow key={p.id ?? `${group.key}-${i}`}>
                      <CTableDataCell>{p.label ?? '—'}</CTableDataCell>
                      <CTableDataCell className="text-end">{p.height}</CTableDataCell>
                      <CTableDataCell className="text-end">{p.width}</CTableDataCell>
                      <CTableDataCell className="text-end">{p.quantity}</CTableDataCell>
                      <CTableDataCell>
                        {canto || specials.length > 0 ? (
                          <span className="d-inline-flex flex-wrap align-items-center gap-2">
                            <CantoPreview sides={sides} />
                            {canto && <span className="text-nowrap">{canto.notation}</span>}
                            {canto?.tape && (
                              <span className="text-body-secondary">{canto.tape}</span>
                            )}
                            {/* One entry per special tape, in the notation the seller typed. */}
                            {specials.map((e, k) => (
                              <span key={k} className="text-nowrap">
                                {(canto || k > 0) && '· '}
                                {e.notation}
                                {e.tape && (
                                  <span className="text-body-secondary ms-2">{e.tape}</span>
                                )}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-body-secondary">—</span>
                        )}
                      </CTableDataCell>
                      {withWorkshop && (
                        <CTableDataCell className="text-nowrap">
                          {workshopCodesLine(p) || <span className="text-body-secondary">—</span>}
                        </CTableDataCell>
                      )}
                      <CTableDataCell className="text-end">{p.priority}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        {p.canRotate ? 'Sí' : 'No'}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </Fragment>
            ))}
          </CTableBody>
        </CTable>
      </div>
    </>
  )
}

export default OrderPiecesTable
