# Web (SPA)

React + TypeScript + Vite frontend for Fin-U-CH.

## Tech stack

- React 18 + TypeScript
- Vite
- Redux Toolkit + RTK Query
- React Router 6
- Tailwind CSS
- Axios

## Quick start

### 1) Install

```bash
pnpm install
```

### 2) Run dev server

```bash
pnpm dev
# Open http://localhost:5173
```

### 3) Build for production

```bash
pnpm build
pnpm preview
```

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm preview` — preview production build
- `pnpm lint` — run ESLint

## Project structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Root component with routing
├── components/           # Shared components
├── pages/                # Route pages
├── features/             # Feature modules
├── store/                # Redux store and API
└── shared/               # Reusable UI & utilities
    ├── ui/               # UI components
    ├── lib/              # Utilities
    ├── api/              # API client
    └── config/           # Configuration
```

## Routing

Defined in `src/App.tsx`:

- Public: `/`, `/login`, `/register`
- Private (wrapped by `PrivateRoute`):
  - `/dashboard`
  - `/operations`
  - `/plans`
  - `/reports`
  - `/catalogs/articles`
  - `/catalogs/accounts`
  - `/catalogs/departments`
  - `/catalogs/counterparties`
  - `/catalogs/deals`
  - `/catalogs/salaries`

Unknown paths redirect to `/`.

## State management

- `src/store/store.ts` — store setup
- `src/store/api/apiSlice.ts` — RTK Query API slice
- Slices: `auth`, `notification`, etc.
- Notifications via `NotificationContainer` mounted in `App`.

## Environment

- `VITE_API_URL=/api` (default dev/prod via Nginx/proxy)
- See root `env.example` and `apps/web/vite.config.ts` for proxy settings.

## Local development

Requirements:

- API running on `localhost:4000` (see `apps/api`)

Start dev server (Vite HMR):

```bash
cd apps/web
pnpm dev
# Open http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:4000`.

## Testing

- Unit/Integration: Jest + Testing Library
- E2E: Playwright

```bash
pnpm test
pnpm test:e2e
pnpm test:e2e:ui
```

## Auth

- JWT-based. Requests attach `Authorization: Bearer <token>` via API client.

## Notes

- Keep routes in sync with backend prefixes under `/api/*`.
- Use shared DTOs/constants from `packages/shared` when possible.
