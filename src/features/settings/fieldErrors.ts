import { ApiError } from 'src/shared/api/types'

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
