# Maderable Dashboard — Development Guide

## Prerequisites

- Node.js 18+ (check with `node -v`)
- npm (bundled with Node)
- See `ARCHITECTURE.md` for the full tech stack and project structure

## Setup & Commands

```bash
npm install          # install dependencies
npm start            # dev server → http://localhost:3000
npm run typecheck    # tsc --noEmit (strict) — MUST pass before committing
npm run lint         # eslint src — MUST pass before committing
npm run build        # production build → build/
npm run serve        # preview production build at http://localhost:4173
```

**Before committing:** `npm run typecheck` + `npm run lint` + `npm run build` must all pass.

## Adding a Feature

Create `src/features/<name>/` with these files:

```
src/features/myfeature/
├── MyFeaturePage.tsx    # page component(s)
├── routes.ts            # AppRoute[] export
├── nav.tsx              # NavItem[] export — MUST be .tsx (contains JSX / CIcon)
├── myfeatureApi.ts      # HTTP calls via shared httpClient
├── useMyFeature.ts      # React Query hooks
└── types.ts             # domain types/interfaces
```

Wire it in with exactly two additions:

```ts
// src/shared/routes.ts
import { myfeatureRoutes } from 'src/features/myfeature/routes'
// spread into the routes array: ...myfeatureRoutes

// src/shared/components/AppSidebar.tsx
import { myfeatureNav } from 'src/features/myfeature/nav'
// spread into the nav composition
```

No other files change.

### routes.ts template

```ts
import type { AppRoute } from 'src/shared/routes'
const MyFeaturePage = React.lazy(() => import('./MyFeaturePage'))

export const myfeatureRoutes: AppRoute[] = [
  { path: '/myfeature', name: 'My Feature', element: MyFeaturePage },
]
```

### nav.tsx template

```tsx
import CIcon from '@coreui/icons-react'
import { cilStar } from '@coreui/icons'
import type { NavItem } from 'src/shared/components/AppSidebarNav'

export const myfeatureNav: NavItem[] = [
  {
    component: 'CNavItem',
    name: 'My Feature',
    to: '/myfeature',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
]
```

### API module template

```ts
import { httpClient } from 'src/shared/api/httpClient'
import type { PaginatedResult } from 'src/shared/api/types'
import type { MyThing, MyThingPayload } from './types'

export const myfeatureApi = {
  list: (params?: Record<string, string>) =>
    httpClient.list<MyThing>('/api/v1/mythings', params),
  get: (id: number) =>
    httpClient.get<MyThing>(`/api/v1/mythings/${id}`),
  create: (payload: MyThingPayload) =>
    httpClient.post<MyThing>('/api/v1/mythings', payload),
  update: (id: number, payload: Partial<MyThingPayload>) =>
    httpClient.patch<MyThing>(`/api/v1/mythings/${id}`, payload),
}
```

### React Query hook template

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { myfeatureApi } from './myfeatureApi'
import type { MyThingPayload } from './types'

export const useMyThings = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['mythings', params],
    queryFn: () => myfeatureApi.list(params),
  })

export const useCreateMyThing = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MyThingPayload) => myfeatureApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mythings'] }),
  })
}
```

### Component template

```tsx
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import type { ReactNode } from 'react'

interface MyComponentProps {
  title: string
  children?: ReactNode
}

const MyComponent = ({ title, children }: MyComponentProps) => (
  <CCard>
    <CCardHeader>{title}</CCardHeader>
    <CCardBody>{children}</CCardBody>
  </CCard>
)

export default MyComponent
```

## TypeScript Conventions

- **No `import React`** — the project uses the `react-jsx` transform. Import named
  hooks/types only: `import { useState, type FormEvent } from 'react'`
- **Props**: always type with an `interface`, never `prop-types` (package removed)
- **`import type`**: use for types consumed only as types (helps tree-shaking)
- **No `any`**: `@typescript-eslint/no-explicit-any` is set to `error`
- **Domain types**: co-locate in the feature's `types.ts`; import with `import type { … }`
- **Discriminated unions**: preferred for entities with variant shapes (e.g., `Product` → `board | edge_banding`)

## API Error Handling

React Query types errors as `Error`. To read `.status` / `.errors` from API errors, narrow:

```ts
import { ApiError } from 'src/shared/api/types'

if (error instanceof ApiError) {
  console.log(error.status)   // HTTP status code
  console.log(error.errors)   // ApiErrorItem[]
}
```

## Key Gotchas

### UTC-naive timestamps (analytics)

The analytics API returns timestamps without timezone offset (`"2026-06-15T08:05:00"`).
`review/format.ts` interprets these as local time (wrong). For analytics always use
`dashboard/format.ts`: `asUtc(iso)` appends `Z`, then `fmtLocalTime()` / `localHHMM()` format.
Duration in float hours → `fmtHours()`.

### `nav.tsx` must be `.tsx`

Nav files contain JSX (`<CIcon … />`). Vite only processes JSX in `.tsx` files — a `.ts` nav
file will throw at runtime. Always name nav files `nav.tsx`.

### `CFormSelect` size vs htmlSize

`size` on `CFormSelect` is stylistic (`'sm' | 'lg'`), not the HTML `size` attribute for
multi-row listboxes. For a visible multi-row select, use `htmlSize={n}`.

### Strict-mode type guards

`obj?.length > 0` fails under `strict: true` (`number | undefined > 0` is a type error).
Use `obj && obj.length > 0` instead — it also narrows the type for subsequent `.map` calls.

### Date arithmetic

`new Date(a) - new Date(b)` is a type error in TypeScript (operands aren't `number`).
Use `new Date(a).getTime() - new Date(b).getTime()`.

### CSS custom properties in `style`

`React.CSSProperties` doesn't have an index signature for `--*` vars. Use a type assertion:

```tsx
<div style={{ '--cui-foo': value } as CSSProperties} />
```

### Zustand Vite coexistence

`@coreui/utils`'s `getStyle('--cui-…')` returns `string | undefined`. Local types that
receive this value must accept `string | undefined`, not `string`.

## Code Style

Prettier configuration (no semicolons, single quotes, 2-space indentation) is enforced via
`eslint-plugin-prettier`. Running `npm run lint` catches all formatting issues.

Conventional commit messages: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
