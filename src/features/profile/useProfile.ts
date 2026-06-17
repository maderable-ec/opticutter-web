import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from 'src/shared/store/authStore'
import { authApi } from 'src/features/auth/authApi'

/** PATCH /auth/me — updates the editable profile field (fullName) and syncs the store. */
export const useUpdateProfile = () => {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (user) => setUser(user),
  })
}

/** POST /auth/change-password — the API returns 204 and revokes all refresh tokens. */
export const useChangePassword = () =>
  useMutation({
    mutationFn: authApi.changePassword,
  })
