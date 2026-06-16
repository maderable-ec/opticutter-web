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

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
}
