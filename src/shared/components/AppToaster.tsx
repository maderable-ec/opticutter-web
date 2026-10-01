import { CToast, CToastBody, CToaster } from '@coreui/react'

import { MASK } from 'src/shared/analytics'
import { useToastStore } from 'src/shared/store/toastStore'

// Single toaster mounted in the admin layout. CToaster renders CToast children as-is (it only
// injects `visible` on items pushed via its `push` prop), so we pass `visible` explicitly and let
// each toast autohide, removing itself from the store on close.
//
// `text-bg-*` rather than `color` + a forced `text-white`: it pairs each fill with the ink
// `color-contrast()` picks for it, so a warning toast is dark on amber instead of white at 2:1.
const AppToaster = () => {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <CToaster placement="top-end" className="p-3">
      {toasts.map((t) => (
        <CToast
          key={t.id}
          visible
          autohide
          delay={4000}
          className={`text-bg-${t.color} border-0`}
          onClose={() => removeToast(t.id)}
        >
          <CToastBody {...(t.mask ? MASK : {})}>{t.message}</CToastBody>
        </CToast>
      ))}
    </CToaster>
  )
}

export default AppToaster
