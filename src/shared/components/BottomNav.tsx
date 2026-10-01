import { NavLink } from 'react-router-dom'
import Icon from 'src/shared/icons/Icon'

import type { BottomNavItem } from 'src/shared/navigation'
import useUIStore from 'src/shared/store/uiStore'

interface BottomNavProps {
  // Already filtered to the user and the screen (`bottomNavFor`); the layout mounts none when empty.
  items: BottomNavItem[]
  // The screen is one of «Más»'s (`sheetHolds`): it lights like a destination of the bar.
  moreCurrent: boolean
}

// The phone's navigation, under the thumb: the menu behind a hamburger in the top corner was the
// only way around, two taps and a stretch for every move between Cotizaciones and Órdenes. Below
// `md` only; from there up the sidebar is on screen or one tap away. «Más» opens the rest of the
// menu in a sheet right above it (`NavSheet`).
const BottomNav = ({ items, moreCurrent }: BottomNavProps) => {
  const sheetShow = useUIStore((s) => s.navSheetShow)
  const setSheetShow = useUIStore((s) => s.setNavSheetShow)

  return (
    <nav className="bottom-nav d-md-none" aria-label="Navegación rápida">
      {items.map((item) => {
        // «Cotizar», the one entry that starts work: a disc raised over the bar, named but with no
        // label, so it reads as the bar's action and not as a sixth place.
        if (item.primary && item.to) {
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className="bottom-nav-plus"
              aria-label={item.label}
            >
              <span className="bottom-nav-plus__disc">
                <Icon name={item.icon} />
              </span>
            </NavLink>
          )
        }
        const content = (
          <>
            <span className="bottom-nav-icon">
              <Icon name={item.icon} />
            </span>
            {item.label}
          </>
        )
        return item.to ? (
          <NavLink key={item.label} to={item.to} className="bottom-nav-item">
            {content}
          </NavLink>
        ) : (
          <button
            key={item.label}
            type="button"
            className={`bottom-nav-item${moreCurrent ? ' active' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={sheetShow}
            aria-current={moreCurrent || undefined}
            onClick={() => setSheetShow(true)}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
