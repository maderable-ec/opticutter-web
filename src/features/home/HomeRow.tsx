import { Link } from 'react-router-dom'
import Icon from 'src/shared/icons/Icon'
import { CPlaceholder } from '@coreui/react'

import type { HomeRowSpec } from './home'

interface HomeRowProps {
  spec: HomeRowSpec
  // Undefined while it loads, or when it failed (the section says so under its rows).
  count: number | undefined
  loading?: boolean
  // Replaces the spec's hint when the count has more to say («2 agotados»).
  hint?: string
}

// One pile of work on the home screen: what it is, how many, and the list it opens. The whole row
// is the link, a 56px target on a phone. At zero it goes grey, so the screen is coloured only where
// there is something to do.
const HomeRow = ({ spec, count, loading = false, hint }: HomeRowProps) => {
  const idle = count === 0
  return (
    <Link to={spec.to} className={`home-row${idle ? ' home-row--idle' : ''}`}>
      <span
        className={`home-row__icon status-pill--${idle ? 'neutral' : spec.tone}`}
        aria-hidden="true"
      >
        {spec.icon && <Icon name={spec.icon} />}
      </span>
      <span className="home-row__text">
        <span className="home-row__label">{spec.label}</span>
        <span className="home-row__hint">{hint ?? spec.hint}</span>
      </span>
      <span className="home-row__count">
        {count !== undefined ? (
          count
        ) : loading ? (
          <CPlaceholder as="span" animation="glow">
            <CPlaceholder xs={12} />
            <span className="visually-hidden">Cargando…</span>
          </CPlaceholder>
        ) : (
          '—'
        )}
      </span>
      <span className="home-row__chevron" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}

export default HomeRow
