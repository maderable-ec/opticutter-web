export type Role = 'administrador' | 'vendedor' | 'operador' | 'canteador'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export interface User {
  id: number
  email: string
  fullName: string | null
  // One or more roles, in canonical order; the permissions are their union. Only the workshop roles
  // combine (operador + canteador), so a user with several is always a workshop one.
  roles: Role[]
  isActive: boolean
  createdAt: string
  // Staff branch. Required for vendedor/operador/canteador; null for administrador (global role).
  branchId: number | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: 'bearer'
  expiresIn: number
  user: User
}

export interface UpdateMePayload {
  fullName: string | null
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}
