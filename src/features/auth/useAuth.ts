import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from 'src/shared/store/authStore'
import { authApi } from './authApi'
import { isGlobalBranchRole } from './permissions'
import type { Role, User } from './types'

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => setSession(data.accessToken, data.refreshToken, data.user),
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  return () => {
    const { refreshToken, clearSession } = useAuthStore.getState()
    const done = () => {
      clearSession()
      navigate('/login')
    }
    // Revoke the refresh token server-side, but log out locally regardless.
    if (refreshToken) {
      authApi.logout(refreshToken).finally(done)
    } else {
      done()
    }
  }
}

export const useCurrentUser = (): User | null => useAuthStore((s) => s.user)

export const useHasRole = (...roles: Role[]): boolean => {
  const user = useAuthStore((s) => s.user)
  return user ? roles.includes(user.role) : false
}

export const useIsGlobalBranchRole = (): boolean => {
  const user = useAuthStore((s) => s.user)
  return isGlobalBranchRole(user?.role)
}
