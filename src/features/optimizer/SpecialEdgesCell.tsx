import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CFormInput } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'

import type { EdgeBandingProduct } from 'src/features/products/types'
import { useToastStore } from 'src/shared/store/toastStore'
import type { BandType, SpecialEdgeForm } from './optimizerForm'
import type { EdgeSide } from './types'
import {
  SPECIAL_EDGE_FORMAT_HINT,
  addSpecialEdges,
  specialEdgeFits,
  specialEdgeTags,
} from './specialEdges'
import { sidesDescription } from 'src/shared/utils/specialEdges'

interface SpecialEdgesCellProps {
  value: SpecialEdgeForm[]
  onChange: (next: SpecialEdgeForm[]) => void
  // The whole catalog of active tapacantos: a special edge may name any design, not only the
  // board's coordinated one.
  catalog: EdgeBandingProduct[]
  byId: Map<string, EdgeBandingProduct>
  // Board thickness (catalog boards only), to pick the width that covers the edge.
  thickness?: number
  // The piece's own type (Tipo column, or its tapacanto's): what an entry without CS/CD takes.
  inheritedBandType: BandType | ''
  // The sides the Canto column bands: an entry completes the other sides before replacing these.
  autoSides: EdgeSide[]
  // Grid wiring, as on every other input of the table.
  row: number
  col: number
  onFocus: () => void
  onNavigate: (e: KeyboardEvent<HTMLInputElement>) => void
}

// The "Cantos especiales" cell: one tag per tape, in the Canto column's own notation (`2L CS BLN`),
// and an input to add more. Enter (or leaving the cell) validates what was typed; every entry gets a
// toast — the confirmation names the real tapacanto, a refusal says what to fix and leaves the text
// in place. A tag always shows the type, also when the seller left it out and the entry took the
// piece's. Removing a tag frees all its sides. The tags are the filter pills (`.filter-chip`), sized
// for a table row.
const SpecialEdgesCell = ({
  value,
  onChange,
  catalog,
  byId,
  thickness,
  inheritedBandType,
  autoSides,
  row,
  col,
  onFocus,
  onNavigate,
}: SpecialEdgesCellProps) => {
  const addToast = useToastStore((s) => s.addToast)
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)

  const commit = () => {
    if (!text.trim()) return
    const { next, messages, rejected } = addSpecialEdges(value, text, catalog, {
      thickness,
      bandType: inheritedBandType,
      autoSides,
    })
    for (const m of messages) addToast(m.message, m.color)
    if (next.length !== value.length) onChange(next)
    setText(rejected.join(', '))
    setInvalid(rejected.length > 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter with something typed adds it; on an empty input it keeps the grid's meaning (next
    // row, or a new one on the last row).
    if (e.key === 'Enter' && text.trim()) {
      e.preventDefault()
      e.stopPropagation()
      commit()
      return
    }
    onNavigate(e)
  }

  const remove = (productId: string) => onChange(value.filter((e) => e.productId !== productId))

  return (
    <div className="d-flex flex-wrap align-items-center gap-1">
      {specialEdgeTags(value, byId).map(({ productId, sides, label, product }) => {
        const fits = specialEdgeFits(product, thickness)
        const title = product
          ? `${product.name} (${product.code}) en ${sidesDescription(sides)}` +
            (fits ? '' : ' · no cubre el espesor del tablero')
          : 'Tapacanto fuera del catálogo activo'
        return (
          <span
            key={productId}
            className={`filter-chip filter-chip--sm${fits && product ? '' : ' filter-chip--warning'}`}
            title={title}
          >
            {label}
            <button
              type="button"
              className="filter-chip-remove"
              aria-label={`Quitar canto especial ${label}`}
              onClick={() => remove(productId)}
            >
              <CIcon icon={cilX} size="sm" />
            </button>
          </span>
        )
      })}
      <CFormInput
        size="sm"
        data-row={row}
        data-col={col}
        value={text}
        invalid={invalid}
        placeholder={value.length ? '+' : '2L CS BLN'}
        title={`Cantos especiales: ${SPECIAL_EDGE_FORMAT_HINT}. Varios con coma.`}
        aria-label="Cantos especiales"
        onFocus={onFocus}
        onChange={(e) => {
          setText(e.target.value)
          setInvalid(false)
        }}
        onKeyDown={handleKeyDown}
        onBlur={commit}
      />
    </div>
  )
}

export default SpecialEdgesCell
