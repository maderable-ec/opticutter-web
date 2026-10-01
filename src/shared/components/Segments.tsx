import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

// A record's page on a phone, in parts. The quote and the order are one long surface from `md`,
// read top to bottom; on a phone that surface is three to four screens, and what the seller came
// for — the total, the cut list, how it was paid — sat somewhere down it. The parts take turns
// there instead, under a sticky control, the way the public review already splits its own.
//
// CSS picks, not JavaScript: every section is mounted and carries `segmentClass(...)`, and below
// `md` only the ones of the active part are shown. From `md` the control is gone and every section
// shows, so the desktop page is exactly what it was. A section may belong to several parts (the
// order's totals are part of both «Resumen» and «Cobro»); it is still ONE element, so the desktop
// page never shows it twice.

export interface SegmentItem<T extends string> {
  id: T
  label: string
}

// The active part lives in the URL, like the page's panels: a reload or a shared link lands on the
// same part. `replace`, so switching parts does not stack history — Back leaves the record.
export const useSegmentParam = <T extends string>(
  ids: readonly T[],
  param = 'vista',
): [T, (next: T) => void] => {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(param)
  const fallback = ids[0] as T
  const value = raw && (ids as readonly string[]).includes(raw) ? (raw as T) : fallback
  const set = useCallback(
    (next: T) =>
      setSearchParams(
        (p) => {
          if (next === fallback) p.delete(param)
          else p.set(param, next)
          return p
        },
        { replace: true },
      ),
    [fallback, param, setSearchParams],
  )
  return [value, set]
}

// The class a section wears: shown below `md` only while one of its parts is active.
export const segmentClass = <T extends string>(active: T, ...parts: T[]): string =>
  `seg-section${parts.includes(active) ? ' is-active' : ''}`

interface SegmentsProps<T extends string> {
  items: SegmentItem<T>[]
  value: T
  onChange: (next: T) => void
  // What the parts are parts of, for a screen reader («Partes de la orden»).
  label: string
}

const Segments = <T extends string>({ items, value, onChange, label }: SegmentsProps<T>) => {
  // Where the bar sits before it sticks. Switching parts brings the page back to it when the page
  // is scrolled past: the new part starts right under the bar, not wherever the previous one was
  // scrolled to — half a screen down, after a long «Cobro».
  const anchorRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const select = (next: T) => {
    onChange(next)
    const anchor = anchorRef.current
    const bar = barRef.current
    if (!anchor || !bar) return
    const stuckAt = parseFloat(getComputedStyle(bar).top) || 0
    const top = anchor.getBoundingClientRect().top + window.scrollY - stuckAt
    if (window.scrollY > top) window.scrollTo({ top })
  }

  return (
    <>
      <div ref={anchorRef} aria-hidden="true" />
      <div ref={barRef} className="segments-bar d-md-none">
        <div className="segments" role="tablist" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === value}
              className="segments__item"
              onClick={() => select(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default Segments
