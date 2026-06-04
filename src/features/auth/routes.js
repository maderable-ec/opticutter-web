import React from 'react'

const LoginPage = React.lazy(() => import('./LoginPage'))
const RegisterPage = React.lazy(() => import('./RegisterPage'))
const Page404 = React.lazy(() => import('./Page404'))
const Page500 = React.lazy(() => import('./Page500'))

export const authRoutes = [
  { path: '/login', name: 'Login Page', element: LoginPage },
  { path: '/register', name: 'Register Page', element: RegisterPage },
  { path: '/404', name: 'Page 404', element: Page404 },
  { path: '/500', name: 'Page 500', element: Page500 },
]
