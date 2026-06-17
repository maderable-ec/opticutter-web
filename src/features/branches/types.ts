// Sucursal (almacén) — recurso del modelo multi-sucursal del API.
export interface Branch {
  id: number
  code: string
  name: string
  address: string | null
  phone: string | null
  isActive: boolean
}

// Referencia compacta incrustada en órdenes, pre-órdenes y borradores (la FK es obligatoria,
// por eso nunca es opcional en esos documentos). Es el tipo compartido de "sucursal dueña".
export interface BranchRef {
  id: number
  code: string
  name: string
}

export interface BranchPayload {
  code: string
  name: string
  address?: string
  phone?: string
}

export interface BranchUpdatePayload {
  code?: string
  name?: string
  address?: string
  phone?: string
  isActive?: boolean
}

export interface BranchListParams {
  search?: string
  offset?: number
  limit?: number
}
