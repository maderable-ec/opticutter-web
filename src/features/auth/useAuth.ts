import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from 'src/shared/store/authStore'
import { authApi } from './authApi'
import type { Role, User } from './types'

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => setSession(data.accessToken, data.user),
  })
}

export const useLogout = () => {
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()
  return () => {
    clearSession()
    navigate('/login')
  }
}

export const useCurrentUser = (): User | null => useAuthStore((s) => s.user)

export const useHasRole = (...roles: Role[]): boolean => {
  const user = useAuthStore((s) => s.user)
  return user ? roles.includes(user.role) : false
}
