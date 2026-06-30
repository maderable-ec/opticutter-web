# Maderable Dashboard

Internal admin dashboard for a woodworking / carpentry manufacturing business.
Manages the full workflow: quotes → orders → cutting → edge-banding → dispatch.

## Quick Start

```bash
npm install
npm start       # dev server → http://localhost:3000
```

## Key Features

- **Cut plan optimizer** — SVG-based board layout visualization, pattern cards, piece detail modal, draft save/load, CSV import/export
- **Order management** — full lifecycle (create → queue → cutting → cut → dispatch), workshop cutting view, edge-banding queue
- **Pre-orders / quotes** — quote lifecycle with client review portal (public link), audit trail, price tiers
- **Analytics** — KPI summary, bottleneck analysis, user productivity, attendance tracking
- **Product catalog** — boards and edge-banding supplies with CSV bulk import
- **Client, user, branch management** — multi-branch model with role-based access
- **Settings** — company info, cutting parameters (kerf, trims), preorder config, price tiers

## Tech Stack

React 19 · TypeScript (strict) · CoreUI React 5 · React Router 7 · TanStack React Query 5 · Zustand · Vite · Sass

## Roles

| Role | Access |
|------|--------|
| `administrador` | All features |
| `vendedor` | Optimizer, quotes, orders, products, clients |
| `operador` | Order cutting workshop |
| `canteador` | Edge-banding queue |

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — tech stack, directory structure, feature map, key subsystems
- [DEVELOPMENT.md](DEVELOPMENT.md) — setup, adding features, TypeScript conventions, gotchas
- [CLAUDE.md](CLAUDE.md) — Claude Code context (critical rules, patterns, API layer)
