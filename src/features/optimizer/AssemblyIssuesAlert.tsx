import { CAlert, CButton } from '@coreui/react'

import type { AssemblyIssue } from 'src/shared/utils/assembly'

interface AssemblyIssuesAlertProps {
  issues: AssemblyIssue[]
  // Jumps to a row, where the jump exists (the wizard's Despiece); the rows are named either way.
  onGo?: (flat: number) => void
  // What the seller cannot do until it is fixed, in their words.
  blocks: string
}

// Assemblies whose layers disagree (`assemblyRowIssues`), with the rows of each. A wall, not a
// notice: the API refuses to save them (`ASSEMBLY_MISMATCH`), so the page says it before the seller
// has filled in the rest for nothing.
const AssemblyIssuesAlert = ({ issues, onGo, blocks }: AssemblyIssuesAlertProps) => {
  if (issues.length === 0) return null
  return (
    <CAlert color="danger" className="py-2 small">
      <ul className="mb-1 ps-3">
        {issues.map((it) => (
          <li key={it.message}>
            {it.message} — filas{' '}
            {it.rows.map((i, n) => (
              <span key={i}>
                {n > 0 && ', '}
                {onGo ? (
                  <CButton
                    color="link"
                    size="sm"
                    type="button"
                    className="p-0 align-baseline"
                    onClick={() => onGo(i)}
                  >
                    #{i + 1}
                  </CButton>
                ) : (
                  `#${i + 1}`
                )}
              </span>
            ))}
            .
          </li>
        ))}
      </ul>
      Cada capa es una fila con el mismo código Ens, la misma medida y la misma cantidad, y el canto
      va en una sola. {blocks}
    </CAlert>
  )
}

export default AssemblyIssuesAlert
