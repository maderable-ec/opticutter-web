# Maderable Dashboard — Architecture

## Project Overview

Internal admin dashboard for a woodworking / carpentry manufacturing business (Maderable).
Single-page application with client-side routing (no SSR). Used by staff across multiple branches
to manage the full manufacturing workflow: quotes → orders → cutting → edge-banding → dispatch.

## Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| UI framework | React (functional components + Hooks) | 19.x |
| Language | TypeScript — `strict: true` | 6.x |
| Component library | CoreUI React + Bootstrap 5 | 5.x |
| Routing | React Router 7 — `HashRouter` | 7.x |
| Server state | TanStack React Query | 5.x |
| UI / auth state | Zustand | 5.x |
| Build | Vite | 8.x |
| Styles | Sass + CoreUI/Bootstrap variables | — |
| Charts | Chart.js + @coreui/react-chartjs | 4.x |

## Architectural Pattern: Vertical Slice

Code is organized **by feature**, not by technical layer. Each feature is self-contained and
exposes only its routes and nav items for composition into the shell.

```
src/features/<name>/
├── <Name>Page.tsx     # Page component(s)
├── routes.ts          # export const <name>Routes: AppRoute[]
├── nav.tsx            # export const <name>Nav: NavItem[]  (must be .tsx — contains JSX)
├── <name>Api.ts       # httpClient calls with typed generics
├── use<Name>.ts       # React Query hooks (useQuery / useMutation)
└── types.ts           # co-located domain types/interfaces
```

Features wire into the shell by adding two imports: routes into `src/shared/routes.ts` and
nav into `src/shared/components/AppSidebar.tsx`. No other files change.

## Directory Structure

```
src/
├── App.tsx                          # HashRouter + public routes + DefaultLayout
├── index.tsx                        # Entry point: QueryClientProvider
│
├── shared/
│   ├── api/
│   │   ├── httpClient.ts            # Typed fetch wrapper (get/list/post/put/patch/delete)
│   │   └── types.ts                 # ApiError, PaginatedResult<T>, Pagination
│   ├── components/                  # App shell components
│   │   ├── AppSidebar.tsx           # Sidebar composing all feature navs (role-filtered)
│   │   ├── AppSidebarNav.tsx        # Nav item renderer
│   │   ├── AppHeader.tsx            # Top bar: theme toggle, user menu
│   │   ├── AppContent.tsx           # Content area + route outlet
│   │   ├── AppBreadcrumb.tsx        # Breadcrumb trail
│   │   ├── SearchableSelect.tsx     # Reusable filterable select
│   │   ├── StatusHistoryCard.tsx    # Timeline of status changes
│   │   ├── PricingBlock.tsx         # Pricing display
│   │   └── ZoomControls.tsx         # Pan/zoom controls for SVG diagrams
│   ├── hooks/
│   │   └── useZoomPan.ts            # Pan and zoom state for SVG views
│   ├── layout/DefaultLayout.tsx     # Authenticated layout wrapper
│   ├── routes.ts                    # AppRoute[] composed from all feature routes
│   ├── scss/                        # Global styles; CoreUI/Bootstrap variable overrides
│   ├── assets/                      # Images, logos
│   └── store/
│       ├── authStore.ts             # Session: token, user, status, setSession, clearSession
│       └── uiStore.ts               # UI: sidebarShow, sidebarUnfoldable, theme
│
└── features/
    ├── auth/                        # Login, Page404, Page500
    ├── analytics/                   # The Estadísticas hub (see below)
    ├── inventory/                   # Stock: the quote's alert and the low-stock report
    ├── orders/                      # Order lifecycle + the Taller (queue and cutting canvas)
    ├── preorders/                   # Quote/proposal lifecycle
    ├── products/                    # Product catalog (boards + edge banding)
    ├── clients/                     # Client management
    ├── branches/                    # Branch / location management
    ├── users/                       # Staff user management
    ├── settings/                    # Company, cutting, preorder, price-tier settings
    ├── profile/                     # User self-service (profile + password)
    ├── optimizer/                   # Cut plan optimizer with SVG layout visualization
    ├── review/                      # Public client-facing quote review (no auth)
    └── widgets/                     # CoreUI template showcase — not a production feature
```

## Feature Summary

| Feature | Routes | Description |
|---------|--------|-------------|
| `auth` | `/login` `/404` `/500` | JWT auth, role-based session, public pages |
| `home` | `/home` | The office's landing: what needs doing today |
| `optimizer` | `/preorders/new` | «Cotizar»: the cut plan wizard (Despiece → Optimización → Costos → Cotización), CSV/XML import, fullscreen SVG board diagram, draft save/load. It creates a pre-order |
| `preorders` | `/preorders` `/preorders/:id` | Quote lifecycle (draft→sent→confirmed/rejected); client review links; audit trail |
| `orders` | `/orders` `/orders/:id` `/workshop` `/workshop/orders/:id` | Order lifecycle, and the Taller workspace: its queue and the canvas an order is cut on |
| `clients` | `/clients` | Client management |
| `products` · `productFamilies` · `services` · `inventory` | `/catalog/products` `/catalog/families` `/catalog/services` `/catalog/low-stock` | The Catálogo hub: boards and edge banding, their families, additional services and the low-stock report |
| `analytics` | `/analytics/summary` `/analytics/bottlenecks` `/analytics/productivity` `/analytics/attendance` | The Estadísticas hub: the reports over `/api/v1/analytics/*` |
| `users` · `branches` · `print` · `settings` | `/company/users` `/company/branches` `/company/printing` `/company/settings` | The Empresa hub: staff, branches, print agents and settings |
| `profile` | `/profile` `/profile/change-password` | Self-service profile and password change |
| `review` | `/review/:token` | Public quote review and approval portal (no auth required) |

### URL convention

A URL says which part of the product a screen belongs to:

- **English, kebab-case, plural collections**, with the API's resource name where the screen shows
  one (`/orders` ↔ `/api/v1/orders`, `/analytics/productivity` ↔ `/api/v1/analytics/productivity/*`).
- **A place in the menu is a first segment.** A hub (`HUBS` in `src/shared/hubs.ts`) is a prefix and
  its tabs are the second segment (`/catalog/low-stock`); the hub's own path opens its first tab the
  user may open, and the breadcrumb finds the hub by that prefix. A workspace is a prefix too
  (`/workshop`). The menu's section titles (Ventas, Producción, Gestión) are no places and no
  segments.
- **A record** is `/<collection>/:id`, **a new one** `/<collection>/new`, and **a part of a record**
  a query param (`?view=`), never a path.
- **Query params** are English camelCase like the API's (`branchId`, `isActive`); the UI's own are
  `view`, `panel`, `filters` and `step`.
- **Old paths** (`/optimizer`, `/inicio`, `/dashboard`…, until October 2026) redirect to the new ones
  through `src/shared/legacyRoutes.ts`, query included.

## Key Subsystems

### HTTP Client (`src/shared/api/httpClient.ts`)

Typed fetch wrapper. All API modules use it with explicit generics:

```ts
httpClient.get<T>(path, params?)       // → T
httpClient.list<T>(path, params?)      // → PaginatedResult<T>
httpClient.post<T>(path, body)         // → T
httpClient.put<T>(path, body)          // → T
httpClient.patch<T>(path, body)        // → T
httpClient.delete(path)               // → void
```

Handles JWT injection, automatic token refresh (single-flight pattern on concurrent 401s),
`{data: T, meta}` envelope unwrapping, and `ApiError` construction from error responses.

### Auth & Session

Zustand `authStore` holds `token`, `refreshToken`, `user` (with its `roles`), and `status`.
`App.tsx` restores session on load by calling `/api/v1/auth/me` with the stored token.
`httpClient` reads the token from the store and auto-refreshes on 401.

### Roles

Four roles with distinct route access and landing pages:

| Role | Access | Landing |
|------|--------|---------|
| `administrador` | All features | `/home` |
| `vendedor` | Optimizer, Pre-orders, Orders, Catalog (no low stock), Clients | `/home` |
| `operador` | Workshop board, cutting canvas (`/workshop/orders/:id`) | `/workshop` |
| `canteador` | Workshop board (banding and additional work) | `/workshop` |

A user holds a **list** of roles (`user.roles`) and gets the **union** of their access: every
check goes through `hasAnyRole` (`features/auth/permissions.ts`), and the landing page is the
highest one (`homePathForRoles`). Only the workshop roles combine — a `canteador` learning to cut
is `operador` + `canteador` — which the user form enforces with `toggleRole` and the API with a
`422` on `roles`.

### State Management

- **Server state** (remote data): TanStack React Query — caching, invalidation, mutations
- **Auth state**: Zustand `authStore` — persisted token / session
- **UI state**: Zustand `uiStore` — sidebar, theme
- No Redux anywhere in the codebase

### Cut Plan Optimizer (`features/optimizer`)

The most complex feature. Calls `POST /api/v1/optimize/` with materials and piece requirements.
Backend returns layouts grouped by pattern. The frontend renders:
- `CutLayoutDiagram.tsx` — the plan as one summary line plus a fullscreen diagram behind it, shared
  by the wizard's Costos step and the pre-order detail page
- `cutDrawing.ts` — pure drawing primitives shared with the orders workshop SVG view
- `SheetDetailModal` — expanded pattern view with `PiecePreview` and `GroupedPiecesList`
- `OptimizingOverlay.tsx` — cover for the results pane while `/optimize` runs (tens of seconds on a
  real job): an animated board, the wordmark, a stage message and an elapsed counter

### Multi-Branch Model

Every order, pre-order, and draft has a required `branch` foreign key.
Admins are global; `vendedor` / `operador` / `canteador` users belong to one branch.
API endpoints accept optional `branchId` filter for cross-branch admin queries.
