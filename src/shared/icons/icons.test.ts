import { describe, expect, it } from 'vitest'
import { ORDER_STATUS_CONFIG, ORDER_STATUS_VALUES } from 'src/features/orders/status'
import { PREORDER_STATUS_CONFIG, PREORDER_STATUS_VALUES } from 'src/features/preorders/status'
import type { NavItem } from 'src/shared/components/AppSidebarNav'
import { HUBS } from 'src/shared/hubs'
import { BOTTOM_NAV, NAV_SECTIONS } from 'src/shared/navigation'
import { ICONS, type IconName } from './registry'

// A glyph means one thing. With CoreUI the layers icon was Familias in the menu, «En cola» on an
// order and the material button at once, and the task icon was both Órdenes and a finished order's
// notification. These compare the drawn component, not the name: two names on one glyph is the
// same collision.

const glyph = (name: IconName | undefined) => (name ? ICONS[name] : undefined)

const menuEntries = (items: NavItem[]): NavItem[] =>
  items.flatMap((item) => [item, ...(item.items ? menuEntries(item.items) : [])])

const MENU = NAV_SECTIONS.flatMap((section) => menuEntries(section.items)).filter((i) => i.icon)

const ORDER_ICONS = ORDER_STATUS_VALUES.map((s) => ORDER_STATUS_CONFIG[s].icon)
const QUOTE_ICONS = PREORDER_STATUS_VALUES.map((s) => PREORDER_STATUS_CONFIG[s].icon)

describe('icons', () => {
  it('give every menu entry its own glyph', () => {
    const glyphs = MENU.map((item) => glyph(item.icon))
    expect(new Set(glyphs).size).toBe(MENU.length)
  })

  it('give every hub a glyph no other place has', () => {
    for (const hub of HUBS) {
      const others = MENU.filter((item) => item.name !== hub.name).map((item) => glyph(item.icon))
      expect(others, hub.name).not.toContain(glyph(hub.icon))
      expect(
        MENU.map((item) => item.name),
        hub.name,
      ).toContain(hub.name)
    }
  })

  it('give every entry of the bottom bar its own glyph', () => {
    const glyphs = BOTTOM_NAV.map((item) => glyph(item.icon))
    expect(new Set(glyphs).size).toBe(BOTTOM_NAV.length)
  })

  it('never draw an order or quote state with the glyph of a place', () => {
    const places = new Set([
      ...MENU.map((i) => glyph(i.icon)),
      ...BOTTOM_NAV.map((i) => glyph(i.icon)),
    ])
    for (const icon of [...ORDER_ICONS, ...QUOTE_ICONS]) {
      expect(places.has(glyph(icon)), icon).toBe(false)
    }
  })

  it('tell the states of an order apart by shape', () => {
    expect(new Set(ORDER_ICONS.map(glyph)).size).toBe(ORDER_ICONS.length)
  })

  it('tell the states of a quote apart by shape', () => {
    expect(new Set(QUOTE_ICONS.map(glyph)).size).toBe(QUOTE_ICONS.length)
  })

  it('draw the client confirming the same on the quote and on the order it creates', () => {
    expect(PREORDER_STATUS_CONFIG.confirmed.icon).toBe(ORDER_STATUS_CONFIG.confirmed.icon)
  })
})
