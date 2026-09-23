import { CAlert } from '@coreui/react'

import type { LayoutIssue } from '../types'

// Hand adjustments the server could not apply on this read — the cut list changed under them, a
// sheet type is gone, the kerf moved — so their material fell back to the optimizer's plan. Said
// out loud, because otherwise the seller's rearrangement simply vanishes from the diagram.
const LayoutIssuesAlert = ({ issues }: { issues?: LayoutIssue[] }) => {
  if (!issues?.length) return null
  return (
    <CAlert color="warning" className="py-2 small">
      <div className="fw-semibold mb-1">
        Se descartaron ajustes manuales: ese material vuelve al plan del optimizador.
      </div>
      <ul className="mb-0 ps-3">
        {issues.map((issue, i) => (
          <li key={i}>{issue.message}</li>
        ))}
      </ul>
    </CAlert>
  )
}

export default LayoutIssuesAlert
