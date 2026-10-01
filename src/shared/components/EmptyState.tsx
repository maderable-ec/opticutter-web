import type { ReactNode } from 'react'
import Icon from 'src/shared/icons/Icon'
import type { IconName } from 'src/shared/icons/registry'

interface EmptyStateProps {
  title: string
  // One line on what would fill this space, or on the way out of it.
  hint?: ReactNode
  // A way out, when there is one: "Limpiar filtros" for an over-narrow search, "Nuevo cliente" for
  // an empty catalog. An empty catalog is a fact; an empty search is a dead end that needs a door.
  action?: ReactNode
  icon?: IconName
}

// What a list, a panel or a board shows when there is nothing in it. One shape everywhere, with an
// icon so it reads as "nothing here" at a glance instead of as a stray line of grey text.
const EmptyState = ({ title, hint, action, icon = 'empty' }: EmptyStateProps) => (
  <div className="empty-state">
    <span className="empty-state__icon" aria-hidden="true">
      <Icon name={icon} />
    </span>
    <p className="empty-state__title">{title}</p>
    {hint && <p className="empty-state__hint">{hint}</p>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
)

export default EmptyState
