import { CToast, CToastBody, CToaster } from '@coreui/react'

import { useToastStore } from 'src/shared/store/toastStore'

// Single toaster mounted in the admin layout. CToaster renders CToast children as-is (it only
// injects `visible` on items pushed via its `push` prop), so we pass `visible` explicitly and let
// each toast autohide, removing itself from the store on close.
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
          color={t.color}
          className="text-white"
          onClose={() => removeToast(t.id)}
        >
          <CToastBody>{t.message}</CToastBody>
        </CToast>
      ))}
    </CToaster>
  )
}

export default AppToaster
