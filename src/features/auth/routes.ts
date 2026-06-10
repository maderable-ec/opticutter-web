import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const LoginPage = lazy(() => import('./LoginPage'))
const RegisterPage = lazy(() => import('./RegisterPage'))
const Page404 = lazy(() => import('./Page404'))
const Page500 = lazy(() => import('./Page500'))

export const authRoutes: AppRoute[] = [
  { path: '/login', name: 'Login Page', element: LoginPage },
  { path: '/register', name: 'Register Page', element: RegisterPage },
  { path: '/404', name: 'Page 404', element: Page404 },
  { path: '/500', name: 'Page 500', element: Page500 },
]
