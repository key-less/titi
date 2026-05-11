# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HELPDEX** is an MSP operations dashboard integrating **AutoTask (PSA)** for ticket management and **Datto RMM** for device/patch monitoring, with an **OpenAI-powered AI assistant**. It is a two-repo monorepo:

- `backend/` — Laravel 10+ PHP API (clean architecture)
- `frontend/` — React 18 SPA with Vite + Tailwind CSS v4

---

## Development Commands

### Backend (Laravel)

```bash
cd backend
php artisan serve          # Start API on http://127.0.0.1:8000
php artisan config:clear   # Required after any .env change
php artisan route:list     # Show all registered API routes
php artisan tinker         # REPL for quick testing
```

### Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev      # Dev server on http://localhost:5173 (proxies /api to backend)
npm run build    # Production build
npm run preview  # Preview production build
```

Vite proxies all `/api/*` requests to the backend. The backend URL defaults to `http://127.0.0.1:8000`; override with `VITE_BACKEND_URL` in `frontend/.env`.

---

## Environment Setup

Copy and fill both env files before starting:

```bash
cp backend/.env.example backend/.env
php artisan key:generate   # fills APP_KEY
```

Key variables in `backend/.env`:

| Variable | Purpose |
|---|---|
| `AUTOTASK_ZONE_URL` | AutoTask REST zone (discover via `GET /api/tickets/zone-info?username=`) |
| `AUTOTASK_USERNAME` | API User (API-only) resource email |
| `AUTOTASK_SECRET` | API user password (quote if it contains `#` or `=`) |
| `AUTOTASK_INTEGRATION_CODE` | Tracking identifier from the API user's Security tab |
| `AUTOTASK_VERIFY_SSL` | Set `false` on Windows to avoid cURL 60 errors |
| `DATTO_RMM_API_URL` | Platform API URL (e.g. `https://vidal-api.centrastage.net`) |
| `DATTO_RMM_API_KEY` / `DATTO_RMM_API_SECRET` | From Setup > Users > Generate API Keys |
| `OPENAI_API_KEY` | OpenAI key for AI suggestions and chat |
| `AUTOTASK_QUEUE_IDS` | Comma-separated queue IDs to filter tickets (optional) |

---

## Backend Architecture

The backend uses **clean architecture** layering:

```
backend/app/
  Domain/Entities/        # Plain PHP objects: Ticket, Account, Contact, Resource
  Application/            # Use cases (no framework deps): ListMyTickets, GetTicketWithSuggestions, ChatWithAssistant
  Application/*/          # Interfaces: TicketRepositoryInterface, SuggestionsServiceInterface
  Infrastructure/AutoTask/    # AutoTaskApiClient (HTTP), AutoTaskTicketRepository (implements interface)
  Infrastructure/DattoRmm/    # DattoRmmApiClient (OAuth2 + HTTP)
  Infrastructure/AI/          # OpenAISuggestionsService (implements interface)
  Http/Controllers/Api/   # Thin controllers: delegate to Application use cases
  Providers/HelpdexServiceProvider.php  # DI bindings for all interfaces
```

**Dependency injection** is wired in `HelpdexServiceProvider`. To swap an external service (e.g. replace AutoTask), implement the interface and rebind in the provider.

API routes are all in `backend/routes/api.php`. There is no authentication middleware — the API is intended for internal/trusted use.

**Config files** that map to external API behavior:
- `config/autotask.php` — status/priority label maps, open/closed/resolved status ID arrays, queue label maps
- `config/datto_rmm.php` — patch status label map, SSL, cache TTL
- `config/ai.php` — model, base URL (supports non-OpenAI endpoints)

When status IDs don't match tickets, adjust `autotask.status_labels`, `open_status_ids`, `closed_status_ids`, and `resolved_status_ids` in `config/autotask.php`.

---

## Frontend Architecture

Feature-based structure under `frontend/src/features/`:

```
features/
  dashboard/    api/, components/Dashboard.jsx, hooks/useDashboardMetrics.js
  tickets/      api/, components/MisTicketsPage.jsx, hooks/useTickets.js + useTicketWithSuggestions.js, constants/statuses.js
  devices/      api/, components/DispositivosPage.jsx, hooks/useDevices.js
  patches/      api/, components/ParchesPage.jsx, hooks/usePatches.js
  reports/      api/, components/ReportesPage.jsx
  ai/           api/, components/IaAsistentePage.jsx
shared/api/client.js   # Base HTTP client (fetch wrapper, reads VITE_API_URL)
```

**Routing** is defined in `frontend/src/app/App.jsx` using React Router v6.

**HTTP calls** go through `shared/api/client.js` → feature `api/*.js` → custom hooks → components. Never call `fetch` directly from components.

**Tailwind CSS v4** is used via the `@tailwindcss/vite` plugin (no `tailwind.config.js` needed). CSS variables from the theme are used directly in JSX (e.g. `var(--color-border)`).

The Dashboard is the most complex component — it aggregates `useTickets`, `usePatches`, `useDashboardMetrics` and fetches resources/status on mount.

---

## Common Debugging

- **401 from AutoTask**: Verify the resource has "API User (API-only)" level and a Tracking identifier set. Run `GET /api/tickets/zone-info?username=YOUR_USER` to confirm the correct zone URL.
- **Config not updating**: Run `php artisan config:clear` after every `.env` change.
- **SSL errors on Windows (cURL 60)**: Set `AUTOTASK_VERIFY_SSL=false`, `DATTO_RMM_VERIFY_SSL=false`, or `OPENAI_VERIFY_SSL=false` as needed.
- **Backend unavailable in UI**: The frontend detects connection refused and shows an inline banner with the `php artisan serve` hint.
- **Wrong "Ver en AutoTask" URL zone**: Set `AUTOTASK_WEB_URL` explicitly (e.g. `https://ww14.autotask.net`) then run `php artisan config:clear`.
