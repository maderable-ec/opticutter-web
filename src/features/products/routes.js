import React from 'react'

const ProductsPage = React.lazy(() => import('./ProductsPage'))

export const productsRoutes = [{ path: '/products', name: 'Productos', element: ProductsPage }]
