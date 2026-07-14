import { create } from 'zustand'
import type { AuthStatus, User } from 'src/features/auth/types'
import { localDateKey } from 'src/shared/utils/date'

const ACCESS_KEY = 'cutter.auth.token'
const REFRESH_KEY = 'cutter.auth.refresh'
const LOGIN_DATE_KEY = 'cutter.auth.loginDate'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  status: AuthStatus
  setSession: (token: string, refreshToken: string, user: User) => void
  clearSession: () => void
  setUser: (user: User) => void
  setStatus: (status: AuthStatus) => void
  // Re-checks that the session's login date is still today; clears it otherwise.
  // Returns false (and clears) when the session is stale. Attendance is only
  // recorded server-side on a real POST /auth/login, never on token refresh, so a
  // session must not silently survive past the calendar day it was created on.
  ensureFreshSession: () => boolean
}

let storedToken = localStorage.getItem(ACCESS_KEY)
let storedRefresh = localStorage.getItem(REFRESH_KEY)
const storedLoginDate = localStorage.getItem(LOGIN_DATE_KEY)

// Also catches sessions created before this field existed (loginDate absent).
if (storedToken && storedLoginDate !== localDateKey()) {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(LOGIN_DATE_KEY)
  storedToken = null
  storedRefresh = null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  refreshToken: storedRefresh,
  user: null,
  status: storedToken ? 'loading' : 'unauthenticated',

  setSession: (token, refreshToken, user) => {
    localStorage.setItem(ACCESS_KEY, token)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    localStorage.setItem(LOGIN_DATE_KEY, localDateKey())
    set({ token, refreshToken, user, status: 'authenticated' })
  },

  clearSession: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(LOGIN_DATE_KEY)
    set({ token: null, refreshToken: null, user: null, status: 'unauthenticated' })
  },

  setUser: (user) => set({ user }),

  setStatus: (status) => set({ status }),

  ensureFreshSession: () => {
    if (!get().token) return true
    if (localStorage.getItem(LOGIN_DATE_KEY) === localDateKey()) return true
    get().clearSession()
    return false
  },
}))
