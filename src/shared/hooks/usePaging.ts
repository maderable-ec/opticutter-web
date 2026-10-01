import { useCallback, useEffect } from 'react'
import { useSwipeNav } from './useSwipeNav'

interface PagingOptions {
  // Position on screen; `null` while the viewer is closed, which turns the keys and the swipe off.
  index: number | null
  count: number
  onChange: (index: number) => void
  // Off while a dialog is open over the viewer. The viewers drawn on a page set it (the
  // Optimización step, the cutting canvas): the layout editor and the board picker open over them
  // with keys of their own. A viewer that IS a dialog leaves it off.
  skipUnderModal?: boolean
}

// Paging through records the way every viewer in the app does it: ← / → and a horizontal swipe,
// beside the `Pager` that is always on screen (neither is ever the only way through). Four viewers
// used to carry a copy each, and two of them also paged on Alt+← — the browser's own «back» — and
// inside a text field.
//
// Only the bare keys: Alt+← / Alt+→ walk the wizard's steps and are the browser's back and forward,
// and a text field or an open menu keeps its arrows. `swipeRef` goes on the element the finger
// drags across (see `useSwipeNav`).
export const usePaging = ({ index, count, onChange, skipUnderModal = false }: PagingOptions) => {
  const hasPrev = index != null && index > 0
  const hasNext = index != null && index < count - 1

  const prev = useCallback(() => {
    if (index != null && index > 0) onChange(index - 1)
  }, [index, onChange])
  const next = useCallback(() => {
    if (index != null && index < count - 1) onChange(index + 1)
  }, [index, count, onChange])

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      )
        return
      if (skipUnderModal && document.querySelector('.modal.show')) return
      if (document.querySelector('.dropdown-menu.show')) return
      const to = index + (e.key === 'ArrowRight' ? 1 : -1)
      if (to < 0 || to >= count) return
      e.preventDefault()
      onChange(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onChange, skipUnderModal])

  const swipeRef = useSwipeNav({ onPrev: prev, onNext: next, enabled: index != null })

  return { hasPrev, hasNext, prev, next, swipeRef }
}
