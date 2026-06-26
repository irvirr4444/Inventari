# Inventari Frontend

React client for the Inventari inventory platform.

**Multi-tenancy:** the shell branches on session `uiLloji`. **Legacy** users (`legacy_fixed`) see the original Kosovo/Albania UI. **Dynamic** users sign up on `/login`, complete onboarding at `/onboarding`, then use N-location dashboards with UI driven by `tenant_config.track_price`.

## Documentation

| Doc | Audience | Contents |
| --- | --- | --- |
| **[README-DESKTOP.md](README-DESKTOP.md)** | Wide viewports (~768px+) | Legacy/dynamic dashboards, modals, Historiku modal, desktop styling, product & business reference |
| **[README-MOBILE.md](README-MOBILE.md)** | Phones & touch / `?mobile=1` | Bottom tabs, bottom sheets, mobile Histori/Permbledhje, styling contracts |
| **[../docs/android-apk.md](../docs/android-apk.md)** | Android APK packaging | Capacitor setup, API/CORS, build & release checklist (not implemented in repo yet) |

Both shells share the same backend API, auth, and business rules. `useMobileClient` picks the shell at `/`.

## Development

### Stack

- React 19 + TypeScript
- Vite 8
- TanStack Query for server state
- Plain CSS in `src/styles/` (import hub via `src/index.css`; no component library)

The browser talks only to the backend API. Supabase credentials stay on the server.

### Prerequisites

- Node.js 20+
- Backend running on `http://localhost:3001` (see [backend/README.md](../backend/README.md))
- Supabase migrations **07**, **APPLY_08_through_11**, **13**, and **14** applied for multi-tenant auth and tenant config (see repo [README.md](../README.md))

### Setup

From the repository root:

```bash
npm install
cp frontend/.env.example frontend/.env   # or set VITE_* in repo root .env
npm run dev
```

Or copy env from the repo root (Vite reads root `.env` via `envDir`):

```bash
cp .env.example .env   # if present; or use backend/.env + root .env
```

Log in with legacy credentials from `.env` (`login_email` / `login_password`) on the **Hyr** tab — enter the email or **`Legacy User`** in the Emri field. Use **Regjistrohu** only for a new dynamic account (unique Emri + password). Google sign-in appears when `VITE_GOOGLE_CLIENT_ID` is set.

### Scripts

| Command | Description |
| --- | --- |
| `npm -w frontend run dev` | Start Vite dev server |
| `npm -w frontend run build` | Typecheck and build for production |
| `npm -w frontend run lint` | Run ESLint |
| `npm -w frontend run preview` | Preview the production build |

From the repo root: `npm run dev` starts backend and frontend together. `npm run test` runs shared + backend unit tests (frontend has no test suite yet).

### Environment

Copy `frontend/.env.example` to `frontend/.env`, or put `VITE_*` variables in the **repo root** `.env` (Vite `envDir` points to the repo root).

```env
VITE_API_BASE_URL=/api

# Must match backend GOOGLE_CLIENT_ID for the Google button to appear
VITE_GOOGLE_CLIENT_ID=
```

In development, Vite proxies `/api` to `http://localhost:3001`. In production, set `VITE_API_BASE_URL` to the public API base URL if it differs.

#### Google sign-in (optional)

1. Create a **Web application** OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. **Authorized JavaScript origins:** `http://localhost:5173` (dev), plus your production frontend URL (`https://…`, no trailing slash). `localhost` is allowed for dev; LAN IPs (`192.168.x.x`) are not.
3. **Authorized redirect URIs:** usually not required for this app’s ID-token flow; if the console requires one, use the frontend root URL (same as origins), not the API URL.
4. Set the same client ID in backend `GOOGLE_CLIENT_ID` and frontend `VITE_GOOGLE_CLIENT_ID`.
5. Set backend `CORS_ORIGIN` to your frontend origin (e.g. `http://localhost:5173`).

### Project structure

```text
frontend/
  src/
    App.tsx                    Routes, auth gate, legacy vs dynamic shell
    main.tsx                   Bootstrap + providers
    providers/AppProviders.tsx AuthProvider; CountryProvider (legacy) or LokacioniProvider + TenantConfigProvider (dynamic)
    index.css                  Imports styles/index.css hub
    styles/                    Design tokens, components (auth.css), features, responsive
    components/                Modal, ConfirmModal, DateInput, DateRangeInput, OraInput, OraRangeInput, …
    hooks/                     useSnackbar, useActionItems, useTenantConfig, feature hooks, useMobileClient
    lib/
      api.ts                   Main API client (products, actions, exports)
      pointerDismissGuard.ts   Overlay/sheet dismiss without click-through to UI below
      api/http.ts              Fetch wrapper (credentials, errors)
      api/auth.ts              login, signup, session, Google
      api/lokacionet.ts        Location CRUD
      api/tenantConfig.ts      POST tenant-config, complete, tutorial-seen
      auth/AuthProvider.tsx    Session state, refreshSession, logout
      auth/postAuthRedirect.ts Post-login path helper (dashboard vs onboarding vs tutorial)
      auth/types.ts            SessionUser shape (incl. tenantConfig)
      tenantConfig/            TenantConfigContext — session-backed useTenantConfig()
      lokacioni/               Dynamic location types + provider
    features/
      auth/                    GoogleSignInButton (GIS ID token)
      locations/               LocationPicker, LocationAddModal, LocationsEditor, emoji picker
      onboarding/              OnboardingWizard (5 screens), TutorialOverlay; CSS in styles/features/
      settings/                LocationsSettingsPage, TenantConfigDisplay (read-only config summary)
      dynamic/                 DynamicDashboardPage, Dynamic* panels, history, hooks
      dynamic/mobile/          DynamicMobileApp (N-location mobile tabs)
      actions/                 Legacy ActionEntryPanel, TransferModal; shared ActionItemsTable, ActionReviewModal
      products/                ProductsPanel, ProductFormModal
      summary/                 SummaryPanel, CountrySummary
      history/                 HistoryModal, filters, print page, Shkarko export dropdown, edit submodules
    mobile/                    Legacy mobile UI (XK/AL tabs)
    pages/
      DashboardPage.tsx        Legacy desktop dashboard
      useDashboardPage.ts      Legacy dashboard state hook
      useDynamicDashboardPage.ts Dynamic dashboard state hook
      LoginPage.tsx            Combined login + sign-up card
    …
packages/shared/               Zod schemas, productLabel, summary builders
```

### Authentication & routing

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Combined **Hyr** / **Regjistrohu** card (Emri, password, optional Google) |
| `/signup` | Public | Redirects to `/login?mode=signup` |
| `/onboarding` | Auth, dynamic | 5-screen onboarding wizard (until `tenantConfig.onboarding_complete`) |
| `/onboarding/locations` | Auth | Redirects to `/onboarding` (legacy URL) |
| `/settings/locations` | Auth, dynamic | Edit locations + read-only tenant config summary |
| `/history/print` | Auth | Historiku A4 print preview (filter state via query params; lazy-loaded) |
| `/` | Auth | Legacy or dynamic dashboard (desktop/mobile by viewport); per-user tutorial overlay once after onboarding |
| `/mobile/*` | — | Redirects to `/` |

`AuthProvider` loads `GET /api/session` on mount. Dynamic session users include nested `tenantConfig: { track_price, onboarding_complete, tutorial_seen }`.

- **Legacy** users (`uiLloji === legacy_fixed`) skip onboarding and render `DashboardPage` / `MobileApp`.
- **Dynamic** users with `!tenantConfig.onboarding_complete` are redirected to `/onboarding`.
- **Dynamic** users after onboarding render `DynamicDashboardPage` (desktop) or `DynamicMobileApp` (mobile); tutorial shows when `!tenantConfig.tutorial_seen`.

`AppProviders` branches providers: **legacy** and logged-out users get `CountryProvider` only; **dynamic** users get `LokacioniProvider` + `TenantConfigProvider`. Dynamic code must not call `useCountry()`.

#### Login page (`LoginPage.tsx`)

Single card on `/login`:

1. **Hyr** / **Regjistrohu** toggle (same `toggle-group` pattern as action card).
2. **Emri** + **Fjalekalimi** (both modes). Legacy admin can enter their email or `Legacy User` on **Hyr**.
3. Primary button: **Hyr** or **Krijo Llogari**.
4. **ose** divider + **Vazhdo me Google** when `VITE_GOOGLE_CLIENT_ID` is set (custom label over Google Identity Services button).
5. **Red error snackbar** at the bottom of the screen for validation and API errors (same `.snackbar.error` as the dashboard — no inline error box in the form).

**Sign-up rules:** Emri is required and must be unique (case-insensitive). Values containing `@` are rejected — use **Hyr** for email-based legacy login.

Post-auth redirects (`lib/auth/postAuthRedirect.ts`):

| Case | Destination |
| --- | --- |
| Legacy login | `/` |
| Dynamic user with `tenantConfig.onboarding_complete` | `/` |
| New sign-up or dynamic user without completed onboarding | `/onboarding` |

**Stuck on onboarding?** You are signed into a new dynamic account, not the legacy admin. On welcome use **Kthehu te hyrja**, then sign in on **Hyr** with your legacy email or `Legacy User`. On later wizard steps use **← Kthehu** to edit a previous screen.

#### Onboarding wizard (`/onboarding`)

Five screens in `features/onboarding/screens/`, styled with the same navy gradient and blue primary as login (`styles/features/onboarding-wizard.css` — uses `--primary`, `--card`, etc.).

| Step | Screen | Behavior |
| --- | --- | --- |
| 1 | `Screen1Welcome` | Intro; top bar **Kthehu te hyrja** → logout |
| 2 | `Screen2LocationCount` | `−` / `+` or type count (1–20); **← Kthehu** → welcome |
| 3 | `Screen3LocationNames` | **All** name rows shown at once (count from step 2); name input + `LocationEmojiPicker` per row; **← Kthehu** → count |
| 4 | `Screen4Pricing` | Two cards: Me çmime / Vetëm sasi; `POST /api/tenant-config` saves `track_price`; **← Kthehu** → names |
| 5 | `Screen5Confirm` | Summary with real names; **Fillo të punosh →** creates locations, `POST /api/tenant-config/complete`, session refresh → `/` |

State lives in React until confirm (refresh mid-wizard restarts from step 1). Top bar: **Kthehu te hyrja** on welcome only; **← Kthehu** on steps 2–5.

#### Post-onboarding tutorial

Shown once per dynamic user when `tenantConfig.tutorial_seen === false`.

| Piece | Location |
| --- | --- |
| Overlay | `features/onboarding/TutorialOverlay.tsx` |
| Gating | `App.tsx` (`shouldShowTutorial`) + session `tenantConfig.tutorial_seen` |
| Styles | `styles/features/tutorial-overlay.css` |
| Dismiss | Skip/complete/navigate → `POST /api/tenant-config/tutorial-seen` + `refreshSession()` |

Desktop: 7 steps (`data-tutorial` on products table, action card, location picker, etc.). Mobile: 5 steps on bottom-nav tabs (`tab-produkte`, `tab-veprime`, …).

Post-onboarding location edits remain at `/settings/locations` (`LocationsSettingsPage` + `TenantConfigDisplay` read-only summary).

Not implemented in v1: forgot-password, social providers other than Google.

### API client

`src/lib/api.ts` and `src/lib/api/*` wrap backend calls with cookie-based auth (`credentials: 'include'`).

Main endpoints used by the UI:

| Function / module | Purpose |
| --- | --- |
| `api/auth.ts` — `login`, `signup`, `loginWithGoogle`, `logout`, `fetchSession` | Authentication |
| `api/lokacionet.ts` — CRUD | Dynamic locations (`emri`, `flag_emoji`; no client `kodi`) |
| `listProducts` / `createProduct` / `updateProduct` / `deleteProduct` | Legacy product CRUD |
| `listDynamicProducts` / `updateDynamicProduct` | Dynamic product list + PATCH with `stock[]` |
| `createActionBatch` | Legacy `Hyrje`, `Dalje`, `Transfer` (`shteti`) |
| `createDynamicActionBatch` | Dynamic actions (`lokacioni_id`, optional `destination_lokacioni_id`) |
| `listActionBatches` / `getActionBatch` | History list/detail (`lokacioni_id`, labels for dynamic) |
| `updateActionBatch` | Meta patch — `shteti` (legacy) or `lokacioni_id` (dynamic) |
| `analyticsSummary` | `SummaryByCountry` (legacy) or `SummaryByLocation` (dynamic) |
| `exportProductsUrl` / `exportDynamicProductsUrl` / `exportUrl` | Excel downloads (products + Permbledhje) |
| `downloadHistoryDocument` (`lib/historyDocumentDownload.ts`) | Filtered Historiku xlsx / pdf / docx |

See [README-DESKTOP.md](README-DESKTOP.md) for payload examples.

## Related docs

- [Frontend mobile UI](README-MOBILE.md)
- [Frontend desktop UI](README-DESKTOP.md)
- [Backend API and architecture](../backend/README.md)
- [Repo root quick start](../README.md)
- [Local development](../docs/local-dev.md)
- [SQL migrations](../docs/sql/)
- [Onboarding wizard & tenant config (V2)](../onboarding_revamp.md)
