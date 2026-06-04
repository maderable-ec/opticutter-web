import React from 'react'
import AppContent from '../components/AppContent'
import AppSidebar from '../components/AppSidebar'
import AppFooter from '../components/AppFooter'
import AppHeader from '../components/AppHeader'

const DefaultLayout = () => {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
