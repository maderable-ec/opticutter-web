import { useEffect, useId } from 'react'
import { Link, useLocation } from 'react-router-dom'

import Icon from 'src/shared/icons/Icon'
import useUIStore from 'src/shared/store/uiStore'

import { useFromHere } from '../hooks/useShellNav'
import { entryCurrent } from '../navigation'
import type { NavSection } from '../navigation'
import BottomSheet from './BottomSheet'

interface NavSheetProps {
  // What to offer, already cut to the bar on screen (`sheetSectionsFor`).
  sections: NavSection[]
}

interface SheetSectionProps {
  section: NavSection
  pathname: string
  onPick: () => void
}

const SheetSection = ({ section, pathname, onPick }: SheetSectionProps) => {
  const titleId = useId()
  const fromHere = useFromHere()
  return (
    <section className="nav-sheet__section" aria-labelledby={section.title ? titleId : undefined}>
      {section.title && (
        <h3 id={titleId} className="nav-sheet__title eyebrow">
          {section.title}
        </h3>
      )}
      <ul className="nav-sheet__list">
        {section.items.map((item) => {
          if (!item.to) return null
          const current = entryCurrent(item, pathname)
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                // Into a workspace the link carries the way back out, as the sidebar's does.
                state={item.workspace ? fromHere : undefined}
                className={`nav-sheet__link${current ? ' active' : ''}`}
                aria-current={current ?? undefined}
                onClick={onPick}
              >
                {item.icon && <Icon name={item.icon} size="lg" />}
                <span className="nav-sheet__text">
                  <span className="nav-sheet__name">{item.name}</span>
                  {item.tabs && item.tabs.length > 1 && (
                    <span className="nav-sheet__tabs">{item.tabs.join(' · ')}</span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The phone's menu: a sheet from the bottom edge, under the thumb that tapped «Más» — the drawer it
 * replaces slid in from the left, with its ✕ in the top corner, and repeated the four entries the
 * bar already had. Here «Más» holds only what the bar lacks, a handful of entries that fit without
 * scrolling; in the optimizer, which has no bar, the header's «Menú» opens it with everything. A hub
 * is one entry, its tabs said under its name: the sheet has no levels to open. From `md` up there is
 * no bar and no sheet: the sidebar's rail is on screen.
 *
 * Mounted once by the layout and opened through the UI store, so both buttons open the same one.
 */
const NavSheet = ({ sections }: NavSheetProps) => {
  const visible = useUIStore((s) => s.navSheetShow)
  const setVisible = useUIStore((s) => s.setNavSheetShow)
  const { pathname } = useLocation()
  const close = () => setVisible(false)

  // Closed by whatever changes the screen, the browser's back included, not only by its own links.
  useEffect(() => {
    setVisible(false)
  }, [pathname, setVisible])

  return (
    <BottomSheet visible={visible} onClose={close} title="Menú" className="nav-sheet">
      <nav aria-label="Menú principal">
        {sections.map((section, i) => (
          <SheetSection
            key={section.title ?? i}
            section={section}
            pathname={pathname}
            onPick={close}
          />
        ))}
      </nav>
    </BottomSheet>
  )
}

export default NavSheet
