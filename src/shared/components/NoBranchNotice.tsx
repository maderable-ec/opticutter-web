import { CAlert } from '@coreui/react'
import { ApiError } from 'src/shared/api/types'

// Detecta el `403 FORBIDDEN` que el backend devuelve cuando un staff quedó sin sucursal asignada
// (estado inválido que corrige el admin). Se usa para mostrar un aviso en vez de romper la pantalla.
export const isNoBranchError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 403

const NoBranchNotice = () => (
  <CAlert color="warning" className="mb-0">
    Tu usuario no tiene una sucursal asignada; contacta al administrador.
  </CAlert>
)

export default NoBranchNotice
