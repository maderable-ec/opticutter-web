import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import type { Role } from 'src/features/auth/types'
import type { MockApi } from '../fixtures/api'
import { client, minutesAgo, reviewPreOrder, workshopQueueItem } from '../fixtures/data'
import { boardMaterial, piece, seedOptimizer, stubOptimizer } from '../fixtures/scenarios'
import { test } from '../fixtures/test'

// UX captures, not assertions: every scenario × viewport × theme writes what the user would see to
// e2e/.screens/<scenario>/<viewport>-<theme>.png, next to a .json with what a screenshot does not
// say on its own — page overflow, text clipped inside its box, and the axe (WCAG A/AA) violations.
// Nothing fails on a finding; a missing stub still fails, so a scenario never captures a half-loaded
// screen.
//
//   npm run screens                                  everything
//   npm run screens -- --grep "optimizer"            one scenario
//   npm run screens -- --grep "infinix · light"      one size and theme across scenarios
//
// A new scenario is a route, its stubs and, optionally, the clicks that reach the state to capture.

interface Scenario {
  name: string
  path: string
  // Omitted for public pages: no session at all.
  roles?: Role[]
  // Visible once the screen has its data.
  ready: string
  setup?: (api: MockApi, page: Page) => Promise<void> | void
  act?: (page: Page) => Promise<void>
  // Toasts are hidden by default: the one a scenario's setup triggers (the optimizer's «Restauramos
  // tu trabajo…») covers the header and says nothing about the screen. Set it when the toast IS
  // what the capture is about.
  keepToasts?: boolean
}

const SCENARIOS: Scenario[] = [
  {
    name: 'login',
    path: '/login',
    ready: 'form',
  },
  {
    name: 'optimizer-despiece',
    path: '/optimizer',
    roles: ['vendedor'],
    ready: '.pieces-pane',
    setup: async (api, page) => {
      stubOptimizer(api)
      await seedOptimizer(
        page,
        [boardMaterial()],
        [
          piece(720, 560, 2, 'Lateral', { left: true, top: true }),
          piece(764, 560, 1, 'Fondo'),
          piece(720, 396, 2, 'Puerta', { left: true, right: true, top: true, bottom: true }),
          piece(560, 100, 3, 'Travesaño', { left: true }),
          piece(2400, 600, 1, 'Mesón', { left: true, right: true }),
        ],
      )
    },
  },
  {
    name: 'workshop-board',
    path: '/workshop-board',
    roles: ['operador'],
    ready: '.workshop-card',
    setup: (api) => {
      api.get('/orders/workshop-queue', [
        workshopQueueItem({
          orderId: 1,
          orderCode: 'ORD-000041',
          isPriority: true,
          queuedAt: minutesAgo(20),
          client: client({ firstName: 'María Fernanda', lastName: 'Villavicencio Ortega' }),
        }),
        workshopQueueItem({
          orderId: 2,
          orderCode: 'ORD-000038',
          status: 'in_process',
          statusChangedAt: minutesAgo(95),
          progress: { cutPieces: 7, totalPieces: 18 },
          activities: [
            {
              type: 'cutting',
              status: 'in_progress',
              readyAt: minutesAgo(200),
              startedAt: minutesAgo(95),
            },
            { type: 'banding', status: 'pending', readyAt: minutesAgo(80) },
          ],
        }),
        workshopQueueItem({ orderId: 3, orderCode: 'ORD-000043', queuedAt: minutesAgo(300) }),
      ])
    },
  },
  {
    name: 'review',
    path: '/review/e2e-token',
    ready: 'h5',
    setup: (api) => {
      api.get('/public/review/e2e-token', reviewPreOrder())
    },
  },
]

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  // The shop-floor tablets, with the browser bar taken off (see playwright.config.ts).
  infinix: { viewport: { width: 960, height: 544 }, hasTouch: true },
  ipad: { viewport: { width: 1080, height: 735 }, hasTouch: true },
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
}

const THEMES = ['light', 'dark'] as const

const OUT_DIR = path.resolve(__dirname, '../.screens')

// Page overflow and text clipped inside its own box: the two things that read as a broken screen
// and that nobody notices in a screenshot until they look for them.
const measure = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement
    const describe = (el: Element): string => {
      const classes = [...el.classList].slice(0, 2).map((c) => `.${c}`)
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${classes.join('')}`
    }
    const clipped: { element: string; text: string; hiddenPx: number; ellipsis: boolean }[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (clipped.length >= 25) break
      // The narrow sidebar hides its labels on purpose.
      if (el.closest('.sidebar')) continue
      const style = getComputedStyle(el)
      if (!['hidden', 'clip'].includes(style.overflowX) || el.clientWidth === 0) continue
      const hiddenPx = el.scrollWidth - el.clientWidth
      const text = el.innerText?.trim()
      if (hiddenPx <= 1 || !text) continue
      const parent = el.parentElement ? `${describe(el.parentElement)} > ` : ''
      clipped.push({
        element: `${parent}${describe(el)}`,
        text: text.slice(0, 80),
        hiddenPx,
        ellipsis: style.textOverflow === 'ellipsis',
      })
    }
    return {
      size: { width: window.innerWidth, height: window.innerHeight },
      overflowY: Math.max(0, doc.scrollHeight - window.innerHeight),
      overflowX: Math.max(0, doc.scrollWidth - window.innerWidth),
      clipped,
    }
  })

const accessibility = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }))
}

for (const scenario of SCENARIOS) {
  for (const [viewportName, options] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test.describe(() => {
        test.use({ ...options, colorScheme: theme })

        test(`${scenario.name} · ${viewportName} · ${theme}`, async ({ page, api, loginAs }) => {
          if (scenario.roles) await loginAs(scenario.roles, { user: { branchId: 1 } })
          await scenario.setup?.(api, page)
          await page.addInitScript((mode) => {
            localStorage.setItem('coreui-free-react-admin-template-theme', mode)
          }, theme)

          await page.goto(scenario.path)
          await page.locator(scenario.ready).first().waitFor()
          await scenario.act?.(page)
          // The dev-only React Query button floats over the bottom-right corner of every screen;
          // toasts go too unless the scenario keeps them.
          const hidden = ['.tsqd-open-btn-container', ...(scenario.keepToasts ? [] : ['.toaster'])]
          await page.addStyleTag({ content: `${hidden.join(', ')} { display: none !important }` })
          await page.evaluate(() => document.fonts.ready)

          const dir = path.join(OUT_DIR, scenario.name)
          fs.mkdirSync(dir, { recursive: true })
          const base = path.join(dir, `${viewportName}-${theme}`)
          await page.screenshot({ path: `${base}.png`, animations: 'disabled' })
          const report = {
            scenario: scenario.name,
            viewport: viewportName,
            theme,
            ...(await measure(page)),
            axe: await accessibility(page),
          }
          fs.writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`)
        })
      })
    }
  }
}
