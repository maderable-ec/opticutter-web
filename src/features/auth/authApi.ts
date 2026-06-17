import { httpClient } from 'src/shared/api/httpClient'
import type {
  ChangePasswordPayload,
  LoginPayload,
  TokenResponse,
  UpdateMePayload,
  User,
} from './types'

export const authApi = {
  login: (data: LoginPayload) => httpClient.post<TokenResponse>('/api/v1/auth/login', data),
  me: () => httpClient.get<User>('/api/v1/auth/me'),
  updateMe: (data: UpdateMePayload) => httpClient.patch<User>('/api/v1/auth/me', data),
  changePassword: (data: ChangePasswordPayload) =>
    httpClient.post<void>('/api/v1/auth/change-password', data),
  logout: (refreshToken: string) => httpClient.post<void>('/api/v1/auth/logout', { refreshToken }),
}
