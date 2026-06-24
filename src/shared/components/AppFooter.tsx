import { memo } from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div className="ms-auto">
        <span>Powered by Denis Siavichay</span>
      </div>
    </CFooter>
  )
}

export default memo(AppFooter)
