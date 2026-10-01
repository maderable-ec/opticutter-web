import { test as base, expect } from '@playwright/test'
import type { Role, User } from 'src/features/auth/types'
import { MockApi, withAppDefaults } from './api'
import { loginAs } from './session'
import type { LoginOptions } from './session'

// The `test` every spec imports. `api` is installed before the page loads anything and checked at
// teardown: a request without a stub fails the test by name instead of leaving an empty screen.

interface Fixtures {
  api: MockApi
  loginAs: (roles?: Role[], options?: LoginOptions) => Promise<User>
}

export const test = base.extend<Fixtures>({
  // The dev server mounts React Query's devtools button in the bottom-right corner, over the phone's
  // «Más» and the action bar's last button. It never ships, so no test should have to click past it.
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style')
        style.textContent = '.tsqd-parent-container { display: none !important }'
        document.head.append(style)
      })
    })
    await use(page)
  },
  api: async ({ page }, use) => {
    const api = withAppDefaults(new MockApi())
    await api.install(page)
    await use(api)
    api.assertAllMatched()
  },
  loginAs: async ({ page, api }, use) => {
    await use((roles, options) => loginAs(page, api, roles, options))
  },
})

export { expect }
