// App-wide constants shared across features.

// Default page size for paginated list views.
export const PAGE_SIZE = 20

// Rows shown in CSV import preview tables before importing.
export const PREVIEW_LIMIT = 8

// Debounce delay (ms) for search inputs that hit the API on each keystroke.
export const SEARCH_DEBOUNCE_MS = 350

// React Query staleness windows: a short default plus a longer one for slowly-changing
// reference data (settings, price tiers, active branches) to avoid needless refetching.
export const DEFAULT_STALE_TIME = 30_000
export const REFERENCE_STALE_TIME = 5 * 60_000
