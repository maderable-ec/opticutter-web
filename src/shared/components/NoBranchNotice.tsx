import { CAlert } from '@coreui/react'
import { ApiError } from 'src/shared/api/types'

// Detects the `403 FORBIDDEN` the backend returns when a staff member has no branch assigned
// (invalid state, corrected by an admin). Used to show a notice instead of breaking the screen.
export const isNoBranchError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 403

const NoBranchNotice = () => (
  <CAlert color="warning" className="mb-0">
    Tu usuario no tiene una sucursal asignada; contacta al administrador.
  </CAlert>
)

export default NoBranchNotice
