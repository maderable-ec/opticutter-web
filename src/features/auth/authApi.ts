import { httpClient } from 'src/shared/api/httpClient'
import type { LoginPayload, LoginResponse, User } from './types'

export const authApi = {
  login: (data: LoginPayload) => httpClient.post<LoginResponse>('/api/v1/auth/login', data),
  me: () => httpClient.get<User>('/api/v1/auth/me'),
}
