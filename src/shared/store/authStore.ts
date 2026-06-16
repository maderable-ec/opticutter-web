import { create } from 'zustand'
import type { AuthStatus, User } from 'src/features/auth/types'

const TOKEN_KEY = 'cutter.auth.token'

interface AuthState {
  token: string | null
  user: User | null
  status: AuthStatus
  setSession: (token: string, user: User) => void
  clearSession: () => void
  setUser: (user: User) => void
  setStatus: (status: AuthStatus) => void
}

const storedToken = localStorage.getItem(TOKEN_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: null,
  status: storedToken ? 'loading' : 'unauthenticated',

  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, user, status: 'authenticated' })
  },

  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null, status: 'unauthenticated' })
  },

  setUser: (user) => set({ user }),

  setStatus: (status) => set({ status }),
}))
