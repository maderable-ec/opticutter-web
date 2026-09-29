import type { Page } from '@playwright/test'
import type { Role, User } from 'src/features/auth/types'
import type { MockApi } from './api'
import { user } from './data'

export interface LoginOptions {
  user?: Partial<User>
  // The day the session was opened, `YYYY-MM-DD`. Defaults to today (local, like `localDateKey`);
  // any other day is a stale session, which `authStore` clears on boot.
  loginDate?: string
}

// A signed-in session without a backend: the tokens `authStore` reads at import time, plus the
// `/auth/me` that confirms them. The roles decide which routes open (`administrador`, not `admin`).
export const loginAs = async (
  page: Page,
  api: MockApi,
  roles: Role[] = ['administrador'],
  options: LoginOptions = {},
): Promise<User> => {
  const me = user({ roles, ...options.user })
  await page.addInitScript((loginDate) => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    localStorage.setItem('cutter.auth.token', 'e2e-access')
    localStorage.setItem('cutter.auth.refresh', 'e2e-refresh')
    localStorage.setItem('cutter.auth.loginDate', loginDate ?? today)
  }, options.loginDate)
  api.get('/auth/me', me)
  return me
}
