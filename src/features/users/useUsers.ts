import { createCrudHooks } from 'src/shared/hooks/createCrudHooks'
import { usersApi } from './usersApi'
import type { User } from 'src/features/auth/types'
import type { UserListParams, UserPayload, UserUpdatePayload } from './types'

const hooks = createCrudHooks<User, UserListParams, UserPayload, UserUpdatePayload, number>(
  'users',
  usersApi,
)

export const useUsers = hooks.useList
export const useCreateUser = hooks.useCreate
export const useUpdateUser = hooks.useUpdate
export const useDeleteUser = hooks.useDelete
