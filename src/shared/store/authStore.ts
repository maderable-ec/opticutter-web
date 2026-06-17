import { create } from 'zustand'
import type { AuthStatus, User } from 'src/features/auth/types'

const ACCESS_KEY = 'cutter.auth.token'
const REFRESH_KEY = 'cutter.auth.refresh'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  status: AuthStatus
  setSession: (token: string, refreshToken: string, user: User) => void
  clearSession: () => void
  setUser: (user: User) => void
  setStatus: (status: AuthStatus) => void
}

const storedToken = localStorage.getItem(ACCESS_KEY)
const storedRefresh = localStorage.getItem(REFRESH_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  refreshToken: storedRefresh,
  user: null,
  status: storedToken ? 'loading' : 'unauthenticated',

  setSession: (token, refreshToken, user) => {
    localStorage.setItem(ACCESS_KEY, token)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    set({ token, refreshToken, user, status: 'authenticated' })
  },

  clearSession: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    set({ token: null, refreshToken: null, user: null, status: 'unauthenticated' })
  },

  setUser: (user) => set({ user }),

  setStatus: (status) => set({ status }),
}))
