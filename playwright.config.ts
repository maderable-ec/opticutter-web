import { defineConfig, devices } from '@playwright/test'

// End-to-end tests against the real SPA with the API simulated (see e2e/fixtures/api.ts): no
// backend, no credentials, same result on any machine. The npm scripts pick the projects, so a
// bare `npx playwright test` also runs `screens` and WebKit:
//
//   npm run test:e2e   desktop + both workshop tablets (WebKit included)
//   npm run screens    UX captures into e2e/.screens (never in CI)
//
// CI runs Chromium only: `desktop` and `taller-infinix`.

// `E2E_PORT` runs the suite on a server of its own next to the dev server on :3000.
const PORT = Number(process.env.E2E_PORT ?? 3000)

// The shop floor runs on two tablets and every operador/canteador screen must fit both without
// scroll. The Infinix is the binding one: 960×600 CSS, ~544 usable under the browser bar.
const TALLER = /@taller/

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: 'screens/**',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'taller-infinix',
      testIgnore: 'screens/**',
      grep: TALLER,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 960, height: 544 },
        hasTouch: true,
      },
    },
    {
      // The iPad 7 runs Safari (iPadOS 17): 1080×810 CSS, ~735 usable under the browser bar.
      name: 'taller-ipad',
      testIgnore: 'screens/**',
      grep: TALLER,
      use: { ...devices['iPad (gen 7) landscape'], viewport: { width: 1080, height: 735 } },
    },
    {
      name: 'screens',
      testMatch: 'screens/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm start -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Locally the dev server is usually running already; CI starts its own.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
