import React from 'react'

const ReviewPage = React.lazy(() => import('./ReviewPage'))

export const reviewRoutes = [
  { path: '/review/:token', name: 'Revisión de cotización', element: ReviewPage },
]
