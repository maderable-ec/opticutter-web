import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import type { ConfirmTone } from 'src/shared/components/ConfirmDialog'

export interface ConfirmRequest {
  title: ReactNode
  body?: ReactNode
  note?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: ConfirmTone
  touch?: boolean
}

interface UseConfirmOptions {
  // Where the dialog portals when it opens over an element in fullscreen (see `ConfirmDialog`).
  container?: ComponentProps<typeof ConfirmDialog>['container']
}

// `window.confirm` with the app's dialog: `if (!(await confirm({...}))) return`. For a question
// whose answer only lets a synchronous step go on (discard the work, close the editor). An action
// with a request behind it, whose dialog has to wait with a spinner and show the error, mounts
// `ConfirmDialog` itself instead.
//
// The dialog is the second element of the pair; render it where the screen's other dialogs go (inside
// a `Modal`, when the question is asked from one).
export const useConfirm = ({ container }: UseConfirmOptions = {}) => {
  // The request stays after the answer, with `open` off, so the dialog keeps its words while it
  // fades out instead of blanking first.
  const [state, setState] = useState<{ request: ConfirmRequest; open: boolean } | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setState((s) => s && { ...s, open: false })
  }, [])

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        // A question asked over an unanswered one answers the first with «no».
        resolver.current?.(false)
        resolver.current = resolve
        setState({ request, open: true })
      }),
    [],
  )

  // Leaving the screen with the question up is a «no», so nothing waits forever.
  useEffect(() => () => resolver.current?.(false), [])

  const request = state?.request
  const dialog = request ? (
    <ConfirmDialog
      visible={state.open}
      title={request.title}
      note={request.note}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      tone={request.tone}
      touch={request.touch}
      container={container}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    >
      {request.body}
    </ConfirmDialog>
  ) : null

  return [confirm, dialog] as const
}
