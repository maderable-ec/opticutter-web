export type Role = 'administrador' | 'vendedor' | 'operador'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export interface User {
  id: number
  email: string
  fullName: string | null
  role: Role
  isActive: boolean
  createdAt: string
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
