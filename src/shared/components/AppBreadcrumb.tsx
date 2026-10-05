import { Link } from 'react-router-dom'
import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'

import type { Crumb } from '../navigation'

interface AppBreadcrumbProps {
  // `breadcrumbsFor`: the screen itself is the last one.
  crumbs: Crumb[]
}

// Router links, not `href`s: a crumb used to reload the whole app (and drop the optimizer's undo,
// the query cache and the open sidebar) just to go one list up. Keyed by name, unique along a trail.
const AppBreadcrumb = ({ crumbs }: AppBreadcrumbProps) => (
  <CBreadcrumb className="my-0">
    {crumbs.map((crumb, index) =>
      index === crumbs.length - 1 ? (
        <CBreadcrumbItem key={crumb.name} active>
          {crumb.name}
        </CBreadcrumbItem>
      ) : (
        <CBreadcrumbItem key={crumb.name}>
          <Link to={crumb.to}>{crumb.name}</Link>
        </CBreadcrumbItem>
      ),
    )}
  </CBreadcrumb>
)

export default AppBreadcrumb
