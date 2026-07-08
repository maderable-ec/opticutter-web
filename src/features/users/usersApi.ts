import { createCrudApi } from 'src/shared/api/crudApi'
import type { User } from 'src/features/auth/types'
import type { UserListParams, UserPayload, UserUpdatePayload } from './types'

export const usersApi = createCrudApi<User, UserListParams, UserPayload, UserUpdatePayload, number>(
  '/api/v1/users',
)
