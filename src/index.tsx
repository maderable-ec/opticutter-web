import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import 'core-js'

import App from './App'
import { DEFAULT_STALE_TIME } from 'src/shared/constants'

// App-wide query defaults: a short stale window plus one retry, and no refetch on window
// focus — mutations invalidate their query families explicitly, so focus refetching only
// added noise. Reference-data hooks override staleTime with REFERENCE_STALE_TIME.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No se encontró el elemento raíz #root')

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <App />
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>,
)
