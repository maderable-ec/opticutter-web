import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Transient "Guardado ✓" flash used for success feedback, matching the pattern in
 * OptimizerPage. Returns the boolean and a trigger; auto-resets after `ms`.
 */
export const useSavedFlash = (ms = 2000) => {
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback(() => {
    setSaved(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), ms)
  }, [ms])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return [saved, flash] as const
}
