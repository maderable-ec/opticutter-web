import type { PostHog } from 'posthog-js'

import { useAuthStore } from 'src/shared/store/authStore'

// Product analytics (PostHog Cloud): what the sellers actually do in the optimizer, which the
// backend cannot see — opening the cut diagram is a modal, not a request. This module is the only
// door to PostHog: the event list below is the whole contract, and nothing else imports the SDK.
//
// Three rules hold everything here:
//   1. Same origin. Every request goes to /ingest, which Caddy proxies to PostHog (and Vite, in
//      dev). The CSP stays `connect-src 'self'`, and the SDK comes from npm, never from a <script>.
//   2. Event properties are counts, internal ids and booleans. Never a client's name, a price or a
//      measurement: those belong to the quote, not to the analytics.
//   3. Session replay sees the screen, so client data on screen is masked where it is rendered:
//      spread MASK on the element that shows it, or put NO_CAPTURE on it when the value also rides
//      in an attribute (`title`, `aria-label`), which text masking does not reach. Inputs are
//      masked wholesale.
//
// Without VITE_POSTHOG_KEY (dev, CI, a local build) the module is inert: no request is ever made.
//
// The SDK is imported dynamically, after the first render: it is ~100 KB gzipped, and the main chunk
// is what every page waits for. Whatever happens before it arrives waits in a short queue.

const KEY = import.meta.env.VITE_POSTHOG_KEY

// The public review page is opened by the client with a link whose token is a credential. It never
// loads PostHog, and `before_send` drops anything captured while it is on screen.
const REVIEW_PREFIX = '/review/'
const OPTIMIZER_PATH = '/optimizer'

// Masks the element's text, and everything inside it, in session replay.
export const MASK = { 'data-ph-mask': '' } as const
// PostHog's block class: the element is recorded as an empty box. For values held in attributes.
export const NO_CAPTURE = 'ph-no-capture'

type Step = 'pieces' | 'costs' | 'quote'

// Event names are English snake_case. `$pathname` rides on every event, so the diagram and editor
// events need no "where": it tells the wizard (/optimizer) from the pre-order (/preorders/:id).
interface Events {
  optimizer_step_viewed: { step: Step; index: number }
  cut_diagram_opened: { patterns: number; sheets: number }
  // `patterns_seen` against `patterns` tells a look from an open-and-close.
  cut_diagram_closed: {
    patterns: number
    patterns_seen: number
    seconds_open: number
    reason: 'close' | 'adjust'
  }
  layout_editor_opened: undefined
  layout_editor_applied: { pools: number }
  layout_editor_cancelled: { dirty: boolean }
  layout_adjustments_discarded: undefined
  preorder_created: {
    preorder_id: number
    has_layout_adjustments: boolean
    diagram_opened: boolean
    editor_opened: boolean
  }
}

type EventName = keyof Events

let enabled = false
let client: PostHog | null = null
const pending: ((ph: PostHog) => void)[] = []

const withPosthog = (fn: (ph: PostHog) => void) => {
  if (client) fn(client)
  else if (enabled) pending.push(fn)
}

// What happened while the wizard built the quote on screen, read when that quote is created.
// Module state, not React state: the diagram and the editor that set it live in other components.
// It survives navigating away and back (the workspace does too); a reload loses it.
const optimizerSession = { diagramOpened: false, editorOpened: false }

export const resetOptimizerSession = () => {
  optimizerSession.diagramOpened = false
  optimizerSession.editorOpened = false
}

export const track = <E extends EventName>(
  event: E,
  ...[props]: Events[E] extends undefined ? [] : [Events[E]]
) => {
  // The same diagram and editor serve the pre-order page; only the wizard's count toward its quote.
  if (window.location.pathname === OPTIMIZER_PATH) {
    if (event === 'cut_diagram_opened') optimizerSession.diagramOpened = true
    if (event === 'layout_editor_opened') optimizerSession.editorOpened = true
  }
  // Stamped now: a call queued while the SDK loads must not carry the moment it was flushed.
  const timestamp = new Date()
  withPosthog((ph) => ph.capture(event, props, { timestamp }))
}

// The end of the wizard's funnel: did this quote leave having had its plan looked at, or changed?
export const trackPreorderCreated = (preorderId: number, hasLayoutAdjustments: boolean) => {
  track('preorder_created', {
    preorder_id: preorderId,
    has_layout_adjustments: hasLayoutAdjustments,
    diagram_opened: optimizerSession.diagramOpened,
    editor_opened: optimizerSession.editorOpened,
  })
  resetOptimizerSession()
}

// `env` separates the developer's own runs from production in every insight.
const registerEnv = (ph: PostHog) => ph.register({ env: import.meta.env.MODE })

const start = (posthog: PostHog, key: string) => {
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-08-30',
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    // Only the events above. Autocapture and rage clicks record element text, which here is full
    // of client names; page views are not what we are asking.
    autocapture: false,
    rageclick: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_surveys: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',
      recordHeaders: false,
      recordBody: false,
    },
    // No console and no network in the replay: request URLs carry the client search, and the
    // console can print whole payloads.
    enable_recording_console_log: false,
    capture_performance: false,
    before_send: (event) => (window.location.pathname.startsWith(REVIEW_PREFIX) ? null : event),
  })
  registerEnv(posthog)
}

export const initAnalytics = () => {
  if (!KEY || window.location.pathname.startsWith(REVIEW_PREFIX)) return
  enabled = true

  // Identity follows the auth store, so login, a restored session and logout are all covered
  // here. The staff user, never a client: id, e-mail, name and roles. The e-mail is what finds a
  // seller in PostHog when `fullName` was never filled in (it is also what PostHog shows as the
  // person's name). Subscribed before the SDK loads: the session restore usually lands first, and
  // it queues.
  useAuthStore.subscribe(({ user }, prev) => {
    if (user === prev.user) return
    withPosthog((ph) => {
      if (user) {
        ph.identify(String(user.id), {
          email: user.email,
          name: user.fullName,
          roles: user.roles,
        })
        ph.register({ roles: user.roles, branch_id: user.branchId })
      } else {
        ph.reset()
        registerEnv(ph)
      }
    })
  })

  import('posthog-js')
    .then(({ default: posthog }) => {
      start(posthog, KEY)
      client = posthog
      for (const fn of pending.splice(0)) fn(posthog)
    })
    // Analytics never gets in the way: if the chunk fails to load, the app just runs without it.
    .catch(() => {
      enabled = false
      pending.length = 0
    })
}
