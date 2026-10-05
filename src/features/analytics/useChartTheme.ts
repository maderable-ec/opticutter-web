import { useEffect, useMemo, useState } from 'react'
import { getStyle } from '@coreui/utils'

const currentMode = () => document.documentElement.dataset.coreuiTheme ?? 'light'

// `#rrggbb` → the same colour at `alpha`, for the wash under a line: a canvas takes no CSS
// `color-mix()`. Anything else comes back unchanged.
export const withAlpha = (color: string, alpha: number) => {
  const hex = color.trim().replace(/^#/, '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return color
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * The colours a Chart.js canvas needs, read off the theme's tokens: a canvas cannot use CSS
 * variables, so each value is resolved here and read again when the theme switches. `mode` is the
 * key the charts remount on, which redraws every colour at once — Chart.js only picks up new
 * options when its data changes too.
 *
 * The one data colour is the technical accent (`--mb-tech`), the teal the app keeps for measures and
 * the optimization: none of these charts plots a status, so none wears a status tone, and the coral
 * stays the colour of the action. Text is text ink, never the series colour.
 */
export const useChartTheme = () => {
  const [mode, setMode] = useState(currentMode)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setMode(currentMode())
    root.addEventListener('ColorSchemeChange', sync)
    return () => root.removeEventListener('ColorSchemeChange', sync)
  }, [])

  return useMemo(() => {
    const accent = getStyle('--mb-tech') || '#0e7490'
    return {
      mode,
      accent,
      wash: withAlpha(accent, 0.1),
      surface: getStyle('--cui-body-bg') || '#fff',
      muted: getStyle('--cui-secondary-color'),
      grid: getStyle('--cui-border-color-translucent'),
    }
    // `mode` is the dependency on purpose: the tokens are read again once the theme has switched.
  }, [mode])
}

export type ChartTheme = ReturnType<typeof useChartTheme>
