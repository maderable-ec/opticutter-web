import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CContainer } from '@coreui/react'

import { carryParams } from '../navigation'
import type { HubView } from '../navigation'

interface SectionNavProps {
  // `hubFor`: already cut to the tabs this user may open.
  hub: HubView
}

/**
 * A hub's tabs: its screens on the segmented track, under the breadcrumb that names the hub. The
 * layout mounts it, so the pages inside a hub know nothing about it. Each tab is a link to its
 * route (a lateral move: no origin), carrying the hub's shared query, so the four reports keep the
 * period and the branch from one to the next.
 *
 * On a phone the track sticks under the header and scrolls sideways when the words do not fit
 * (the four reports do not, at 390px). The tab on screen is brought to the middle of the track by
 * scrolling the track itself: `scrollIntoView` would drag the page too. A track that goes on past
 * an edge fades out there: a tab cut clean at the edge read as the last one, and nobody found
 * Asistencia.
 */
const SectionNav = ({ hub }: SectionNavProps) => {
  const { pathname, search } = useLocation()
  const trackRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ start: false, end: false })
  const query = carryParams(search, hub.keepParams)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    // A pixel of slack: a fractional width can leave the track a hair short of its end.
    const start = track.scrollLeft > 1
    const end = track.scrollLeft + track.clientWidth < track.scrollWidth - 1
    setMore((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])

  useLayoutEffect(() => {
    const track = trackRef.current
    const tab = track?.querySelector<HTMLElement>('[aria-current="page"]')
    if (track && tab && track.scrollWidth > track.clientWidth) {
      const box = track.getBoundingClientRect()
      const at = tab.getBoundingClientRect()
      const offset = at.left + at.width / 2 - (box.left + box.width / 2)
      track.scrollTo({ left: track.scrollLeft + offset })
    }
    measure()
  }, [pathname, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return (
    <nav className="section-nav" aria-label={hub.name}>
      <CContainer className="px-2 px-md-4" lg>
        <div
          ref={trackRef}
          className="segments section-nav__track"
          data-more-start={more.start || undefined}
          data-more-end={more.end || undefined}
          onScroll={measure}
        >
          {hub.tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={{ pathname: tab.to, search: query }}
              className="segments__item"
            >
              {tab.name}
            </NavLink>
          ))}
        </div>
      </CContainer>
    </nav>
  )
}

export default SectionNav
