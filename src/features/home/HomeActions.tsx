import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from 'src/shared/icons/Icon'
import { CButton, CFormSelect } from '@coreui/react'

import { useActiveBranches } from 'src/features/branches/useBranches'
import { isRequirementEmpty } from 'src/features/optimizer/optimizerForm'
import { loadAutosave } from 'src/features/optimizer/optimizerStorage'
import { useStartQuote } from 'src/features/optimizer/useStartQuote'

interface HomeActionsProps {
  branchId: number | undefined
  // The admin looks at one branch or all of them; a seller's screen is their branch's.
  onBranchChange?: (branchId: number | undefined) => void
}

// The screen's first move: a new quote, or the despiece left open in this browser. «Nueva
// cotización» discards that despiece first, after asking (`useStartQuote`).
const HomeActions = ({ branchId, onBranchChange }: HomeActionsProps) => {
  const { data: branches = [] } = useActiveBranches()
  // Read once: the autosave is only written from the optimizer, never while this screen is up.
  const [draft] = useState(loadAutosave)
  const pieces = draft ? draft.requirements.filter((r) => !isRequirementEmpty(r)).length : 0
  const { startQuote, dialog } = useStartQuote()

  const branchName = branches.find((b) => b.id === branchId)?.name

  return (
    <div className="surface home-actions">
      {draft && (
        <Link to="/optimizer" className="btn btn-primary btn-lg">
          Continuar despiece
          {pieces > 0 && ` · ${pieces} ${pieces === 1 ? 'pieza' : 'piezas'}`} ›
        </Link>
      )}
      <CButton
        color="primary"
        variant={draft ? 'outline' : undefined}
        size="lg"
        type="button"
        onClick={startQuote}
      >
        <Icon name="add" className="me-1" />
        Nueva cotización
      </CButton>
      <div className="home-actions__branch">
        {onBranchChange ? (
          <CFormSelect
            aria-label="Sucursal"
            value={branchId ?? ''}
            onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </CFormSelect>
        ) : (
          branchName && <span className="text-body-secondary">Sucursal {branchName}</span>
        )}
      </div>
      {dialog}
    </div>
  )
}

export default HomeActions
