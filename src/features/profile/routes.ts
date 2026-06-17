import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const ProfilePage = lazy(() => import('./ProfilePage'))
const ChangePasswordPage = lazy(() => import('./ChangePasswordPage'))

// No `roles`: any authenticated user can view/edit their own profile and password.
export const profileRoutes: AppRoute[] = [
  { path: '/profile', name: 'Perfil', element: ProfilePage },
  { path: '/profile/change-password', name: 'Cambiar contraseña', element: ChangePasswordPage },
]
