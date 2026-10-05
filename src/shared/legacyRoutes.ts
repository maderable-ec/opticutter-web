import { generatePath, matchPath } from 'react-router-dom'

// The paths the app answered to before its URLs said which part of the product a screen belongs to
// (October 2026). Bookmarks, the browser's history and links pasted into a chat still carry them,
// so each one leads to where its screen lives now. Only paths: a query keeps its keys, and a part of
// a record named the old way (`?vista=cobro`) falls back to the record's first part.
export const LEGACY_REDIRECTS: readonly { from: string; to: string }[] = [
  { from: '/inicio', to: '/home' },
  { from: '/optimizer', to: '/preorders/new' },
  { from: '/workshop-board', to: '/workshop' },
  { from: '/orders/:id/workshop', to: '/workshop/orders/:id' },
  { from: '/products', to: '/catalog/products' },
  { from: '/product-families', to: '/catalog/families' },
  { from: '/additional-services', to: '/catalog/services' },
  { from: '/analytics/low-stock', to: '/catalog/low-stock' },
  { from: '/dashboard', to: '/analytics/summary' },
  { from: '/analytics/users', to: '/analytics/productivity' },
  { from: '/users', to: '/company/users' },
  { from: '/branches', to: '/company/branches' },
  { from: '/print-agents', to: '/company/printing' },
  { from: '/settings', to: '/company/settings' },
]

/** Where an old path lives now, its parameters carried over; null for a path that never moved. */
export const legacyTarget = (pathname: string): string | null => {
  for (const { from, to } of LEGACY_REDIRECTS) {
    const match = matchPath(from, pathname)
    if (match) return generatePath(to, match.params)
  }
  return null
}
