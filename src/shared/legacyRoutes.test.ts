import { describe, expect, it } from 'vitest'
import { LEGACY_REDIRECTS, legacyTarget } from './legacyRoutes'
import { routes } from './routes'
import { matchPath } from 'react-router-dom'

describe('the paths the app used to answer to', () => {
  it('lead to where each screen lives now', () => {
    expect(legacyTarget('/analytics/low-stock')).toBe('/catalog/low-stock')
    expect(legacyTarget('/optimizer')).toBe('/preorders/new')
    expect(legacyTarget('/print-agents')).toBe('/company/printing')
    expect(legacyTarget('/dashboard')).toBe('/analytics/summary')
  })

  it('carry the record they named', () => {
    expect(legacyTarget('/orders/41/workshop')).toBe('/workshop/orders/41')
  })

  it('leave alone every path that never moved', () => {
    expect(legacyTarget('/orders/41')).toBeNull()
    expect(legacyTarget('/preorders')).toBeNull()
    expect(legacyTarget('/analytics/bottlenecks')).toBeNull()
    expect(legacyTarget('/catalog/products')).toBeNull()
  })

  it('each lands on a screen that exists, and none hides one', () => {
    for (const { from, to } of LEGACY_REDIRECTS) {
      expect(
        routes.some((route) => route.path === to),
        to,
      ).toBe(true)
      expect(
        routes.some((route) => matchPath(route.path, from)),
        from,
      ).toBe(false)
    }
  })
})
