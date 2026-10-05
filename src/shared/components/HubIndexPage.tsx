import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from 'src/shared/store/authStore'
import { homePathForRoles } from 'src/features/auth/permissions'
import { hubLanding } from '../navigation'

// A hub's own path (`/catalog`, `/analytics`, `/company`): no screen of its own, it opens the first
// tab the user may open. The route's roles already bounced anyone with none.
const HubIndexPage = () => {
  const { pathname, search } = useLocation()
  const roles = useAuthStore((s) => s.user?.roles)
  const to = hubLanding(pathname, roles) ?? homePathForRoles(roles)
  return <Navigate to={{ pathname: to, search }} replace />
}

export default HubIndexPage
