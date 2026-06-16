import { httpClient } from 'src/shared/api/httpClient'
import type { User } from 'src/features/auth/types'
import type { UserListParams, UserPayload, UserUpdatePayload } from './types'

const BASE = '/api/v1/users'

export const usersApi = {
  list: ({ search, offset = 0, limit = 20 }: UserListParams = {}) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    if (search) params.set('search', search)
    return httpClient.list<User>(`${BASE}/?${params}`)
  },
  create: (data: UserPayload) => httpClient.post<User>(`${BASE}/`, data),
  update: (id: number, data: UserUpdatePayload) => httpClient.put<User>(`${BASE}/${id}`, data),
  remove: (id: number) => httpClient.delete<void>(`${BASE}/${id}`),
}
