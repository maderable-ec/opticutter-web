import { describe, expect, it } from 'vitest'
import { activityBadge } from 'src/features/orders/activities'
import { ORDER_STATUS_CONFIG, ORDER_STATUS_VALUES } from 'src/features/orders/status'
import type { ActivityStatus, ActivityType } from 'src/features/orders/types'
import { PREORDER_STATUS_CONFIG, PREORDER_STATUS_VALUES } from 'src/features/preorders/status'

// A business state is never told by colour alone: every one carries a tone, an icon and its word.
// A new status added to a union without its icon would render as a bare coloured word.

describe('business states', () => {
  it('give every order status a tone, an icon and a label', () => {
    for (const status of ORDER_STATUS_VALUES) {
      const entry = ORDER_STATUS_CONFIG[status]
      expect(entry.label, status).toBeTruthy()
      expect(entry.tone, status).toBeTruthy()
      expect(entry.icon, status).toBeDefined()
    }
  })

  it('give every quote status a tone, an icon and a label', () => {
    for (const status of PREORDER_STATUS_VALUES) {
      const entry = PREORDER_STATUS_CONFIG[status]
      expect(entry.label, status).toBeTruthy()
      expect(entry.tone, status).toBeTruthy()
      expect(entry.icon, status).toBeDefined()
    }
  })

  it('keep the two ends of an order apart: confirmed is not a danger tone', () => {
    expect(ORDER_STATUS_CONFIG.confirmed.tone).not.toBe(ORDER_STATUS_CONFIG.cancelled.tone)
    expect(ORDER_STATUS_CONFIG.cancelled.tone).toBe('danger')
  })

  it('draw each activity state with its own icon', () => {
    const statuses: ActivityStatus[] = ['pending', 'in_progress', 'done']
    const types: ActivityType[] = ['cutting', 'banding', 'additional']
    for (const type of types) {
      const icons = statuses.map((status) => activityBadge({ type, status }).icon)
      expect(new Set(icons).size, type).toBe(statuses.length)
    }
  })
})
