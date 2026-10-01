import { CSpinner } from '@coreui/react'
import type { ComponentProps } from 'react'

// CoreUI's spinner tells a screen reader «Loading...», in English, and there is no global setting
// for it. Every spinner in the app goes through this one, which says it in Spanish unless the
// caller has something more precise to say («Cargando el plan de corte…»). ESLint keeps `CSpinner`
// from being imported anywhere else.
const Spinner = ({
  visuallyHiddenLabel = 'Cargando…',
  ...props
}: ComponentProps<typeof CSpinner>) => (
  <CSpinner visuallyHiddenLabel={visuallyHiddenLabel} {...props} />
)

export default Spinner
