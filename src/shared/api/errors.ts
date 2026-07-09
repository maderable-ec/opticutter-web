import { ApiError } from './types'

/**
 * Human-readable message for an API error, preferring the server's first message.
 * Non-API errors (e.g. network failures with messages like "Failed to fetch") return the
 * friendly `fallback` instead of the raw error text.
 */
export const apiErrorMessage = (
  error: Error | null,
  fallback = 'Error inesperado. Intente nuevamente.',
): string | null => {
  if (!error) return null
  if (error instanceof ApiError) return error.errors[0]?.message ?? error.message ?? fallback
  return fallback
}

/**
 * Maps a server 422 (ApiError) into a `field -> message` record so each input can
 * surface its own error. The backend uses camelCase field names, sometimes prefixed
 * with `body.` (e.g. `body.kerf`) and bracket indices for arrays (`branches[0].name`).
 * We strip the prefix and normalize brackets to dot notation (`branches.0.name`) so
 * both client and server errors share one key shape. Unmapped errors (no `field`) are
 * left out and shown in the section banner.
 */
export const fieldErrorsFromApiError = (error: Error | null): Record<string, string> => {
  if (!(error instanceof ApiError)) return {}
  const out: Record<string, string> = {}
  for (const e of error.errors) {
    if (e.field) {
      const key = e.field.replace(/^body\./, '').replace(/\[(\d+)\]/g, '.$1')
      out[key] = e.message
    }
  }
  return out
}

/** True when there is an error to show but no per-field message was extracted. */
export const hasGenericError = (
  error: Error | null,
  fieldErrors: Record<string, string>,
): boolean => !!error && Object.keys(fieldErrors).length === 0
