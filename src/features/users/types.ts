export type { Role, User } from 'src/features/auth/types'

export interface UserPayload {
  email: string
  password: string
  role: import('src/features/auth/types').Role
  fullName?: string
}

export interface UserUpdatePayload {
  email?: string
  fullName?: string
  role?: import('src/features/auth/types').Role
  isActive?: boolean
  password?: string
}

export interface UserListParams {
  search?: string
  offset?: number
  limit?: number
}
