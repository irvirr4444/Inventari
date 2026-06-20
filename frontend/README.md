# Inventari Frontend

React client for the Inventari inventory platform. This README covers local development and **desktop** product behavior (dashboard at `/` on wide screens). Mobile behavior is summarized in the [Mobile web app](#mobile-web-app) section.

**Multi-tenancy:** the shell branches on session `uiLloji`. **Legacy** users (`legacy_fixed`) see the original Kosovo/Albania dashboard and mobile UI unchanged. **Dynamic** users sign up on `/login` (Regjistrohu tab), complete location onboarding, then use the dynamic dashboard (N locations). See [Authentication & routing](#authentication--routing).

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
- Supabase migrations **07** + **APPLY_08_through_11** applied for multi-tenant auth (see repo [README.md](../README.md))

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

Log in with legacy credentials from `.env` (`login_email` / `login_password`), or use **Regjistrohu** on `/login` for a new dynamic account. Google sign-in appears when `VITE_GOOGLE_CLIENT_ID` is set.

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
    providers/AppProviders.tsx AuthProvider; CountryProvider (legacy) or LokacioniProvider (dynamic)
    index.css                  Imports styles/index.css hub
    styles/                    Design tokens, components (auth.css), features, responsive
    components/                Modal, ConfirmModal, DateInput, OraInput, …
    hooks/                     useSnackbar, useActionItems, feature hooks, useMobileClient
    lib/
      api.ts                   Main API client (products, actions, exports)
      pointerDismissGuard.ts   Overlay/sheet dismiss without click-through to UI below
      api/http.ts              Fetch wrapper (credentials, errors)
      api/auth.ts              login, signup, session, Google
      api/lokacionet.ts        Location CRUD
      auth/AuthProvider.tsx    Session state, refreshSession, logout
      auth/postAuthRedirect.ts Post-login path helper (dashboard vs onboarding)
      auth/types.ts            SessionUser shape
      lokacioni/               Dynamic location types + provider
    features/
      auth/                    GoogleSignInButton (GIS ID token)
      locations/               LocationPicker, LocationAddModal, LocationsEditor, emoji picker
      onboarding/              LocationsOnboardingPage (dynamic gate)
      settings/                LocationsSettingsPage
      dynamic/                 DynamicDashboardPage, Dynamic* panels, history, hooks
      dynamic/mobile/          DynamicMobileApp (N-location mobile tabs)
      actions/                 Legacy ActionEntryPanel, TransferModal; shared ActionItemsTable, ActionReviewModal
      products/                ProductsPanel, ProductFormModal
      summary/                 SummaryPanel, CountrySummary
      history/                 HistoryModal, filters, edit submodules
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
| `/login` | Public | Combined **Hyr** / **Regjistrohu** card (email, password, optional Google) |
| `/signup` | Public | Redirects to `/login?mode=signup` |
| `/onboarding/locations` | Auth, dynamic | First-time location setup (redirect until `has_locations`) |
| `/settings/locations` | Auth, dynamic | Edit locations |
| `/` | Auth | Legacy or dynamic dashboard (desktop/mobile by viewport) |
| `/mobile/*` | — | Redirects to `/` |

`AuthProvider` loads `GET /api/session` on mount. Session user includes `uiLloji`, `isLegacy`, and `has_locations`.

- **Legacy** users (`uiLloji === legacy_fixed`) skip onboarding and render `DashboardPage` / `MobileApp`.
- **Dynamic** users render `DynamicDashboardPage` (desktop) or `DynamicMobileApp` (mobile) after onboarding.
- **Dynamic** users must complete `/onboarding/locations` until `has_locations` is true, then render `DynamicDashboardPage` (N-location panels; no `CountryProvider`).

`AppProviders` branches providers: **legacy** and logged-out users get `CountryProvider` only; **dynamic** users get `LokacioniProvider` only. Dynamic code must not call `useCountry()`.

#### Login page (`LoginPage.tsx`)

Single card on `/login`:

1. **Hyr** / **Regjistrohu** toggle (same `toggle-group` pattern as action card).
2. Email + **Fjalekalimi**; sign-up mode adds optional **Emri**.
3. Primary button: **Hyr** or **Krijo Llogari**.
4. **ose** divider + **Vazhdo me Google** when `VITE_GOOGLE_CLIENT_ID` is set (custom label over Google Identity Services button).
5. **Red error snackbar** at the bottom of the screen for validation and API errors (same `.snackbar.error` as the dashboard — no inline error box in the form).

Post-auth redirects (`lib/auth/postAuthRedirect.ts`):

| Case | Destination |
| --- | --- |
| Legacy login | `/` |
| Dynamic user with locations | `/` |
| New sign-up or dynamic user without locations | `/onboarding/locations` |

API client: `lib/api/auth.ts` — `login`, `signup`, `loginWithGoogle`, `logout`, `fetchSession` (cookie session, `credentials: 'include'`).

Not implemented in v1: forgot-password, social providers other than Google.

### Desktop UI architecture

On viewports **wider than the mobile breakpoint** (`useMobileClient`):

| Account | Desktop component | Mobile component | Provider |
| --- | --- | --- | --- |
| Legacy | `DashboardPage` + `useDashboardPage` | `MobileApp` | `CountryProvider` |
| Dynamic | `DynamicDashboardPage` + `useDynamicDashboardPage` | `DynamicMobileApp` (per-tab hooks) | `LokacioniProvider` |

Both dashboards share the same layout pattern (action card, products + summary grid) and reuse shared pieces (`ActionItemsTable`, `ActionMetaFields`, `ActionReviewModal`, `ConfirmModal`, `Snackbar`) without `isLegacy` branches inside legacy feature files — dynamic behavior lives in `features/dynamic/*` siblings.

#### Legacy dashboard (`DashboardPage`)

The screen has three areas:

1. **Action card** — `Hyrje` / `Dalje` with **Shteti** selector (Kosovo / Albania), date, optional **Ora** and **Pershkrimi**, product rows, **Historiku** → `HistoryModal`.
2. **Products card** — Kosovo + Albania stock columns, sort, search, Excel export.
3. **Summary panel** — per-country Hyrje/Dalje totals for a date range + Permbledhje Excel.

#### Dynamic dashboard (`DynamicDashboardPage`)

Same three-area layout, keyed by **location** instead of country:

| Area | Component | Notes |
| --- | --- | --- |
| Action entry | `DynamicActionEntryPanel` | `DynamicLocationSelect` — single trigger opens a portal menu (all locations + **+ Shto**); inline add modal (emoji + name, success snackbar). No top-bar **Lokacionet** link. |
| Transfer | `DynamicTransferModal` | `Nga` / `Te` location pickers with `excludeIds` (pill row or `<select>` when many locations) |
| Products | `DynamicProductsPanel` | One stock column per active location; headers show emoji + location name + sort arrow; tight **Kodi** column (~10 chars), wider name/location cols; `stock-badge` body cells. `DynamicProductFormModal` — card grid ≤3 locations, scroll table >3. Create then PATCH `stock[]` for initial gjendje. Mobile: `DynamicProdukteTab` — dense card list (no table); every location’s stock shown inline as stat chips on each card (zero = muted grey). |
| Summary | `DynamicSummaryPanel` | Locations with `show_in_summary`; card grid ≤3, scrollable table >3; header/date fixed, location list scrolls inside card |
| Historiku | `DynamicHistoryModal` | **Lokacioni** column + multi-checkbox location filter (client-side); `DynamicActionEditModal` edits `lokacioni_id` / route |
| Finalize review | `ActionReviewModal` | Parent passes `location: { emri, flagEmoji? }` instead of `country` |

**Location UX** (`features/locations/`):

- **Onboarding / settings** (`LocationsEditor`): card UI with `LocationEmojiPicker` + name; server-derived `kodi` (not shown). Settings: reorder, **Shfaq ne Permbledhje**, deactivate.
- **Dashboard picker** (`LocationPicker` + `LocationAddModal`): dropdown menu portaled to `document.body` (z-index above cards); scroll only when the list would hit the viewport edge. **+ Shto** opens add modal (wide emoji grid 2×10 in modal).

**Hooks** (dynamic only): `useDynamicActionEntry`, `useDynamicTransferEntry`, `useDynamicProductCrud`, `useDynamicProductsQuery`.

**Styles:** `styles/features/locations.css` (picker menu, cards, emoji grids); `styles/features/dynamic-dashboard.css` (products table location headers, summary scroll, stock grid/table); `features/dynamic/mobile/dynamic-mobile.css` (dynamic mobile-only: `--surface` chrome on Produkte tab + bottom nav, product cards, stock stat chips, summary compact cards).

#### Dynamic mobile (`DynamicMobileApp`)

On mobile viewports, **dynamic** accounts get purpose-built tabs in `features/dynamic/mobile/` — same bottom tab bar as legacy (`Veprime | Transfer | Produkte | Histori | Permbledhje`), modeled on `src/mobile/tabs/*` but parameterized by **locations** (not countries). Desktop panels are **not** embedded in mobile.

**Chrome:** header and bottom nav use `var(--surface)` with white labels/icons (`dynamic-mobile-bottom-nav` on the portaled `BottomNav`). Tab content backgrounds vary by tab; Produkte uses the same `--surface` fill edge-to-edge.

| Tab | Mobile component | Notes |
| --- | --- | --- |
| Veprime | `tabs/DynamicVeprimeTab.tsx` | `SegmentedControl`; **Lokacioni** + **Data** in one `mobile-field-row`; Ora/Pershkrimi below; `ProductRowCard`, `BottomSheet` finalize |
| Transfer | `tabs/DynamicTransferTab.tsx` | **Nga** / **Te** half-width row; **Data** / **Ora** half-width row; location sheets, `ProductRowCard`, sticky CTA |
| Produkte | `tabs/DynamicProdukteTab.tsx` | Search + **+ Shto produkt** toolbar (no FAB); `DynamicProductCard` list — bold **Emri**, muted **(Kodi)**, all locations as wrapping stat chips (`emoji name qty`); tap card → `BottomSheet` detail/edit/delete |
| **Histori** | `tabs/DynamicHistoriTab.tsx` + `DynamicHistoriBatchDetail.tsx` | Chip filters, card batch list, in-tab detail/edit stack |
| Permbledhje | `tabs/DynamicPermbledhjeTab.tsx` | Per `show_in_summary` location: Hyrje/Dalje **sasi** + **vlerë** (four rows); ≤3 → `mobile-summary-section` cards, >3 → bordered compact cards (same four rows); zeros when empty (no global “no data” hide); **Shkarko Excel** |

Shared mobile components: `components/DynamicProductCard.tsx`, `DynamicLocationPickerSheet.tsx`, `DynamicMobileStockLevels.tsx`; `mobile/components/BottomNav.tsx` (optional `className` for dynamic theming), `DatePickerSheet.tsx`, `TimePickerSheet.tsx` (bottom-sheet date/time pickers).

Mobile mode is detected by `useMobileClient` / `lib/mobileClient.ts` (UA, viewport, `?mobile=1`, or `sessionStorage` after login redirect). Use **`?mobile=1`** on desktop to test; login keeps mobile mode via query params + session storage.

#### Shared desktop behavior (legacy + dynamic)

The dashboard is **viewport-locked** on desktop (~1080p): the action card keeps a fixed height (product rows scroll inside the table after 2 lines), the products table fills its card and scrolls internally, and the summary panel stays compact below.

#### Action card and finalize review

- **Product rows** use `ActionItemsTable` with a **fixed 2-row** scroll area (`--action-visible-rows: 2`, `--action-row-height: 62px`). Row 3+ scroll inside the card; a reserved hint slot shows `↕ N produkte — scroll për të parë të gjitha` when needed (no layout jump when the hint appears).
- Optional **Ora** and **Pershkrimi** sit below the date row (`ActionMetaFields`); **Ora** uses `OraInput` + `TimePickerPopover` (`HH:mm`). On **mobile**, `OraInput` opens `TimePickerSheet` (bottom sheet) instead of the desktop portal popover. The wheel columns use **scroll-to-select** (centered row becomes the value), **infinite loop** (00 ↔ 23 / 00 ↔ 59), and hidden scrollbars. Empty values are omitted from `POST /api/actions`. Both are stored on `veprim_batch` (one set per action/transfer batch).
- **Finalizo Veprimin** validates line items first; invalid input shows a **red error snackbar** (e.g. `Sasia duhet te jete > 0.`) without growing the action card.
- On success, validation opens **`ActionReviewModal`** — a large review sheet (`max-width: 960px`, ~10 visible row slots) instead of the small `ConfirmModal` text dialog.
- Review modal header: title, `LlojiBadge` (Hyrje/Dalje), **country flag + label** (legacy) or **location name + emoji** (dynamic via `location` prop), formatted action date, product count; **Pershkrimi** shown below when set (`ActionMetaDisplay`).
- Review body: fixed column headers; scrollable list with **horizontal dividers on every row slot**. When fewer than 10 products, **empty placeholder rows** fill the remaining slots so the table always looks full (Google-picker style). Scroll inside the list only when there are **more than 10** products.
- Each line shows read-only **`Emri (Kodi)`** plus editable **`NumericInput`** for `Cmimi/Njesi` and `Sasia`; line total and footer total update live. Edits write back to the action card state immediately.
- Footer: **Totali i veprimit**, **Anulo**, **Finalizo**. Confirm re-validates; errors stay in the modal with a red snackbar. Success closes the modal, shows a green snackbar, and resets the action form.
- **Transfer** finalize still uses the stacked `ConfirmModal` (review modal is Hyrje/Dalje only on desktop for now).

#### Product entry rows (actions + transfer + history edit)

Desktop product lines use the same controls everywhere:

- **`ProductSearchSelect`** — searchable combobox (`Kerko sipas kodit ose emrit…`) with portal dropdown; shows `Emri (Kodi)`, sorted by code. Used in the action table, transfer modal, and history edit popup (not a native `<select>`).
- **`NumericInput`** — shared number field: when the value is `0`, the input stays empty and shows a muted placeholder (`0`, `0.00`, or `1` depending on field). Focus does not fight a prefilled zero; negative input is blocked.

`ActionItemsTable` column layout: **35% / 20% / 15% / 18% / 12%** with horizontal scroll (`min-width: 760px`) so long product names and large quantities stay readable. The review modal uses a slimmer 4-column layout (**42% / 22% / 16% / 20%**) with read-only product names.

#### Historiku (action history)

**Legacy:** `HistoryModal` with **Shteti** server filter and `CountryCell` display.

**Dynamic:** `DynamicHistoryModal` with **Lokacioni** column (`DynamicLocationCell`), `DynamicHistoryFilterBar` (multi-checkbox location filter on the client), and `DynamicActionEditModal` / `lib/dynamicHistoryBatchEdit.ts` for saves with `lokacioni_id`.

- Button on the right of the Hyrje/Dalje toggle row opens the history modal (~**1200px** wide).
- **Filter bar** — horizontal grouped row; wraps on narrow widths.
  - **Server-side** (API + page reset): **Veprime** (type), **Data** (`Nga` / `Deri`).
  - **Legacy** (`HistoryFilterBar`): **Shteti** (XK/AL) server filter.
  - **Dynamic** (`DynamicHistoryFilterBar`): **Lokacioni** multi-checkbox filter (client-side, `historyClientFilters.locationIds`).
  - **Client-side** (current page): **Ora** range, **Pershkrimi** search, **Totali** / **Produkte** Min/Max.
  - **× Pastro filtrat** when any filter is active. Logic in `lib/historyClientFilters.ts`.
- Paginated table (**8 per page**); pagination total reflects server filters only.
- List columns: **Data**, **Ora**, **Pershkrimi**, **Lloji**, **Shteti** (legacy) or **Lokacioni** (dynamic), **Produkte**, **Totali**, **Veprime**.
- Empty Ora/Pershkrimi show `—` in the list.
- **Pershkrimi** gets the widest meta column (~**22%**); long text ellipsizes with the full value in a `title` tooltip.
- **Produkte** shows the line-item **count only** (e.g. `3`), not `3 produkte`. Column is compact (~**8%**); **Totali** is wider (~**11%**) for euro amounts.
- **Shteti** (legacy): transfers show `[flag] Kosove → Shqiperi [flag]`. **Lokacioni** (dynamic): `DynamicLocationCell` with emoji + custom names.
- Batch meta: `HistoryBatchMetaDisplay`; badges: `LlojiBadge`, `CountryCell` (legacy) or location labels (dynamic).
- Expand a row to view product line items; multiple rows can stay expanded at once.
- **Ndrysho** opens `ActionEditModal` (legacy) or `DynamicActionEditModal` (dynamic) to edit batch meta and product lines. Pre-batch `legacy:…` ids **auto-migrate** on save.
- Inline product edit keeps the **same table columns** as the read-only row (Produkti, Cmimi/Njesi, Sasia, Totali) — no duplicate labels inside the row. **Ruaj** / **Anulo** sit in the actions column.
- Edit row uses `ProductSearchSelect` + `NumericInput`, matching the main action form.
- **Fshi** deletes the whole action after confirmation.
- Successful edit or delete closes the edit popup (when applicable), refreshes list/detail data, and shows a **green success snackbar**.
- Products display as **`Emri (Kodi)`** everywhere (history, pickers, errors).

#### Transfer

Transfer is separate from the main action form:

- **Legacy:** `TransferModal` — `Nga` / `Te` country selectors (`CountrySelect`); `POST /api/actions` with `shteti` + `destination_shteti`.
- **Dynamic:** `DynamicTransferModal` — `DynamicLocationSelect` for both ends; `createDynamicActionBatch` with `lokacioni_id` + `destination_lokacioni_id`.
- **Mobile Transfer tab** (legacy + dynamic): `Nga` / `Te` on one `mobile-field-row` (half width each); **Data** / **Ora** on the next row (half width each); full-width **Pershkrimi** below.
- Shared: action date, optional **Ora** / **Pershkrimi**, `ActionItemsTable`, total, **Finalizo Transfertën**, stacked `ConfirmModal` on finalize (desktop) or `BottomSheet` confirm (mobile).
- On success: modal closes, green snackbar, products and summary refresh.

#### Products card

- Search field filters by **kodi** or **emri** (live, case-insensitive); pickers sorted by **kodi**.
- **Legacy:** `ProductsPanel` + `ProductFormModal` — Kosovo / Shqiperia stock cards; `updateProduct` with `gjendje_kosove` / `gjendje_shqiperi`.
- **Dynamic:** `DynamicProductsPanel` + `DynamicProductFormModal` — one column per location; stock grid (≤3 locations) or table (>3); `updateDynamicProduct` with `stock: [{ lokacioni_id, sasia }]`. Create seeds all locations via API; optional PATCH sets initial stock.
- **Dynamic mobile Produkte tab:** `DynamicProdukteTab` + `DynamicProductCard` — no desktop table; search, toolbar **+ Shto produkt**, card per product with all location chips visible; `BottomSheet` for add/edit/delete (per-location stock fields in form).
- **Delete:** `ConfirmModal`. Success → green snackbar.

#### Summary panel (Permbledhje)

- **Legacy:** `SummaryPanel` — one API call returns **XK** + **AL** totals; transfers count as Dalje (source) / Hyrje (destination).
- **Dynamic:** `DynamicSummaryPanel` — totals keyed by `lokacioni_id` for locations with `show_in_summary`; same date-range semantics.
- Totals use **action date** (`Data e Veprimit`), not `created_at`.
- Excel: same `exportUrl('xlsx', { from, to })` — backend branches legacy template vs dynamic **Veprime** + **Permbledhje** pivot sheets.

**Mobile Permbledhje tab** (bottom tab, not a separate URL):

| Account | Component | Layout | Empty period |
| --- | --- | --- | --- |
| **Legacy** | `src/mobile/tabs/PermbledhjeTab.tsx` | Kosovo + Albania `SummarySection` cards (four metrics each) | Global empty state when both countries have zero qty; per-section “Nuk ka të dhëna…” when that country is all zeros |
| **Dynamic** | `tabs/DynamicPermbledhjeTab.tsx` | One card per `show_in_summary` location — **Hyrje (sasi)**, **Hyrje (vlerë)**, **Dalje (sasi)**, **Dalje (vlerë)** | Always lists every summary location with **0** / **0 €** when there is no activity (only empty when no locations are configured for summary) |

Dynamic mobile uses full-width stacked cards for ≤3 summary locations (`LocationSummarySection`); for >3 locations, the same four rows appear in smaller bordered cards (`dynamic-mobile-summary-compact`) — not a desktop-style scroll table. Both mobile tabs include **Shkarko Excel** below the cards.

#### Feedback (snackbars)

- Green success snackbar (`.snackbar.success`) for: registered actions/transfers, successful history edits/deletes, product create/edit/delete, new location from dashboard picker.
- Red error snackbar (`.snackbar.error`) for: **login / sign-up / Google** errors, action/transfer finalize validation failures, API errors on submit, invalid edits in the review modal.
- Dark default snackbar for other messages (e.g. duplicate product in a row).

#### Shared desktop UI and hooks

- `features/actions/ActionItemsTable` — product rows for action form and transfer modal.
- `features/actions/ActionMetaFields` / `ActionMetaDisplay` — optional Ora + Pershkrimi entry and read-only display (`OraInput` + text field).
- `features/history/HistoryFilterBar`, `features/history/HistoryBatchMetaDisplay`, `features/history/historyBadges` — filter bar, history list meta columns, and type/country badges.
- `lib/historyClientFilters.ts` — client-side Historiku filters applied after the paginated list fetch.
- `components/OraInput`, `components/TimePickerPopover` — shared time entry (`HH:mm`); mobile uses `TimePickerSheet`.
- `lib/pointerDismissGuard.ts` — `handleOverlayDismiss` + short-lived capture-phase guard so tapping a modal/sheet backdrop closes it without activating buttons underneath.
- `features/actions/ActionReviewModal` — large finalize review for Hyrje/Dalje (desktop).
- `features/actions/TransferModal`, `features/products/ProductFormModal` — use `Modal`, `ErrorAlert`, `CountrySelect`, `StockFields`, `NumericInput`.
- `components/ProductSearchSelect`, `components/NumericInput`, `components/ConfirmModal`, `DateInput`, `Snackbar`, `icons`.
- `hooks/useActionItems` — line-item add/remove/validate (action + transfer).
- `hooks/useSnackbar` — toast state + auto-dismiss.
- `pages/useDashboardPage.ts` — legacy dashboard orchestration.
- `pages/useDynamicDashboardPage.ts` — dynamic dashboard orchestration.
- `lib/dynamicHistoryBatchEdit.ts` — dynamic history edit save path.
- `lib/queryKeys` + `lib/invalidateAppData` — React Query cache updates.

Run `docs/sql/05_veprim_batch.sql` in Supabase before using Historiku. Run `docs/sql/06_veprim_batch_ora_pershkrimi.sql` for optional **Ora** and **Pershkrimi**. For multi-tenant auth and data isolation, run `docs/sql/07_perdorues_lokacioni.sql` then `docs/sql/APPLY_08_through_11.sql`, then `npm run seed:legacy-user -w backend` (one-time). New actions get a `batch_id`; history lists grouped batches only. Rows created before batch support appear with `legacy:…` ids until the first edit saves them into `veprim_batch`.

### Mobile web app

On **phones and small touch devices**, the app opens a mobile shell at **`/`** (no `/mobile` path needed). Detection uses screen width, touch capability, user agent, **`?mobile=1`**, or persisted session preference after login.

| Route | Desktop | Phone |
| --- | --- | --- |
| `/` | Dashboard | Mobile app (bottom tabs) |
| `/mobile` | Redirects to `/` | Redirects to `/` |

| Account | Mobile shell | Source |
| --- | --- | --- |
| Legacy (`legacy_fixed`) | `src/mobile/MobileApp.tsx` | Kosovo/Albania tabs |
| Dynamic | `src/features/dynamic/mobile/DynamicMobileApp.tsx` | N-location tabs |

For manual testing on desktop, resize the browser below 768px, use DevTools device mode, or open **`http://localhost:5173/?mobile=1`** to force the mobile UI.

Open **`http://<your-ip>:5173/?mobile=1`** on your phone (same Wi‑Fi). See [docs/local-dev.md](../docs/local-dev.md) for LAN setup.

**Navigation:** fixed bottom tab bar — **Veprime | Transfer | Produkte | Histori | Permbledhje** (both account types). Dynamic mobile styles the bar with `--surface` background and white/muted-white tab icons (legacy keeps the default light bar).

#### Where to find Historiku on mobile

There is no separate `/histori` URL in v1 — history lives on the **Histori** bottom tab:

| Account | Tab component | History implementation | Edit/delete |
| --- | --- | --- | --- |
| **Legacy** | `src/mobile/tabs/HistoriTab.tsx` | Card list + `HistoriBatchDetail` in-tab stack | `lib/historyBatchEdit.ts` |
| **Dynamic** | `tabs/DynamicHistoriTab.tsx` | Card list + `DynamicHistoriBatchDetail` in-tab stack | `lib/dynamicHistoryBatchEdit.ts` |

**Legacy Histori tab:** type/country chips, date filters, advanced filters panel (`HistoriAdvancedFiltersPanel`), tap a batch for detail, **Ndrysho** opens full-screen `HistoriBatchDetail`.

**Dynamic Histori tab:** Lloji + Lokacioni chip filters, date row, advanced filters panel, **card list** of batches (not a table), tap → `DynamicHistoriBatchDetail` with full-screen edit (location sheets for route). Desktop opens history via **Historiku** on the action card (`DynamicHistoryModal` modal); mobile uses the Histori tab.

#### Where to find Permbledhje on mobile

There is no separate `/permbledhje` URL — summary lives on the **Permbledhje** bottom tab:

| Account | Tab component | What you see |
| --- | --- | --- |
| **Legacy** | `src/mobile/tabs/PermbledhjeTab.tsx` | **Nga** / **Deri** date row, Kosovo and Albania cards with Hyrje/Dalje sasi and vlerë, **Shkarko Excel** |
| **Dynamic** | `tabs/DynamicPermbledhjeTab.tsx` | **Nga** / **Deri** date row, one card per summary location (emoji + name) with all four metrics, **Shkarko Excel** |

Desktop dynamic users see the same totals in `DynamicSummaryPanel` (card grid ≤3 locations, table >3). Mobile never embeds that panel — it uses the tab components above.

**Interaction model (legacy mobile; dynamic matches the same patterns):**

- Bottom sheets instead of modal stacks (add product rows, confirm finalize, edit/delete). Dynamic mobile Veprime/Transfer use **BottomSheet** confirm like legacy (not `ActionReviewModal`). **Date** uses `MobileDateInput` → `DatePickerSheet`; **Ora** uses `OraInput` → `TimePickerSheet` on mobile.
- Tapping outside a **bottom sheet** or **modal overlay** closes it only — `lib/pointerDismissGuard.ts` prevents the dismiss tap from activating controls underneath (`BottomSheet`, `Modal`, `ConfirmModal`, history modals).
- **Veprime tab:** `Lokacioni` + **Data** side by side (`mobile-field-row`, labels aligned). **Transfer tab:** `Nga` / `Te` on one row; **Data** / **Ora** on the next (half width each). Long location/country names truncate in narrow fields.
- Card lists instead of tables; touch targets ≥48px.
- Sticky **FINALIZO** CTAs on Veprime and Transfer tabs.
- Veprime and Transfer tabs include optional **Ora** (`OraInput`) / **Pershkrimi** fields; Histori list cards and detail show them when set (date · ora on one line; Pershkrimi as a muted truncated second line with `title` tooltip).
- **Histori tab filters:** type/country chips + date row (server-side, via `useHistoryBatches`); **Filtrat e avancuara ▾** pill opens a collapsible panel for client-side **Ora**, **Pershkrimi**, **Totali**, and **Produkte** filters (reuses `lib/historyClientFilters.ts`; **Apliko** / **Pastro**; active dot on pill when advanced filters are on).
- **Histori batch edit** (`HistoriBatchDetail`): tap **Ndrysho** for a **full-screen edit form** (read view hidden). Header shows **Ndrysho** with back → cancel (unsaved-changes `BottomSheet` when dirty). Sections **DETAJET** (date, country/route, Ora, Pershkrimi) and **PRODUKTET** (all rows editable via `ProductPickerSheet` + `NumericInput`, live line totals, **+ Shto Produkt**, row remove). Sticky footer: **Totali i veprimit** + **Ruaj Ndryshimet**. Saves via `lib/historyBatchEdit.ts` (`updateActionBatch`, `createActionBatchItem`, `deleteActionBatchItem`). Pre-batch actions migrate on first save like desktop.
- Histori detail is an in-tab stack (back button), not a URL route in v1.
- Same API payloads, Albanian strings, and business rules as desktop.

**Structure:**

```text
src/mobile/                          Legacy mobile (XK/AL)
  MobileApp.tsx                      Shell + tab routing
  components/                        BottomSheet, DatePickerSheet, TimePickerSheet, …
  tabs/HistoriTab.tsx                Histori tab + list/detail stack
  tabs/HistoriBatchDetail.tsx        Full-screen legacy history edit
  …

src/features/dynamic/mobile/
  DynamicMobileApp.tsx               Shell + tab routing; passes dynamic bottom-nav class
  tabs/                              DynamicVeprimeTab, Transfer, Produkte, Histori, Permbledhje
  components/                        DynamicProductCard, DynamicLocationPickerSheet, DynamicMobileStockLevels
  dynamic-mobile.css                 Surface chrome, product cards, stock stat chips, summary compact cards
```

**Shared libs/hooks** (used by desktop and mobile):

- `useProductsQuery`, `useActionEntry`, `useTransferEntry`, `useProductCrud`, `useSummaryQuery`, `useHistoryBatches` — legacy desktop/mobile
- `useDynamicDashboardPage` — dynamic **desktop** only
- `useDynamicProductsQuery`, `useDynamicActionEntry`, `useDynamicTransferEntry`, `useDynamicProductCrud` — dynamic desktop + mobile tabs
- `lib/historyClientFilters.ts` — client-side Historiku filters (`locationIds` for dynamic)
- `lib/historyBatchEdit.ts` — legacy history edit save
- `lib/dynamicHistoryBatchEdit.ts` — dynamic history edit save (`lokacioni_id`)

Design reference: [MOBILE_DESIGN_PROMPT.md](../MOBILE_DESIGN_PROMPT.md) at repo root.

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
| `exportProductsUrl` / `exportDynamicProductsUrl` / `exportUrl` | Excel downloads |

Transfer payload (legacy):

```ts
createActionBatch({
  lloji: 'Transfer',
  shteti: 'XK',
  destination_shteti: 'AL',
  data: '2026-06-17',
  ora: '09:30',
  pershkrimi: '…',
  items: [{ kodi_produktit, cmimi_njesi, sasia }],
})
```

Dynamic action / transfer:

```ts
createDynamicActionBatch({
  lloji: 'Hyrje',
  lokacioni_id: '<uuid>',
  data: '2026-06-17',
  items: [{ kodi_produktit, cmimi_njesi, sasia }],
})

createDynamicActionBatch({
  lloji: 'Transfer',
  lokacioni_id: '<from-uuid>',
  destination_lokacioni_id: '<to-uuid>',
  items: […],
})
```

`updateActionBatch` accepts `ora` and `pershkrimi` as `string | null` (send `null` to clear). List/detail responses include `ora` and `pershkrimi` on each batch.

### Styling notes

Styles live under `src/styles/` and are imported via `src/index.css`:

| File | Contents |
| --- | --- |
| `tokens.css` | CSS variables (`:root`) |
| `base.css` | Links, cursor states |
| `components/date-input.css` | Date picker |
| `components/time-input.css` | Ora field; `TimePickerPopover` wheel (scroll-select, infinite loop, hidden scrollbar) |
| `components/forms.css` | Form layout, stock field cards (`stock-fields-grid`) |
| `components/modals.css` | Modals, snackbar, stacked overlay, `action-review-modal` |
| `components/product-search-select.css` | Searchable product combobox + portal list |
| `components/stock-badges.css` | Stock badges |
| `features/dashboard.css` | Layout, cards, tables, toggles, action table scroll (2-row cap) |
| `features/summary.css` | Permbledhje panel |
| `features/history.css` | Historiku modal filters, columns, edit subtable |
| `features/locations.css` | Location picker menu (portal), pills, onboarding/settings cards, emoji grids |
| `features/dynamic-dashboard.css` | Dynamic products table headers, summary scroll, stock grid/table, history location filters |
| `responsive.css` | Breakpoints |

- Dashboard layout is viewport-locked with internal scrolling in the action table (2 rows), products table, and review modal list (10 row slots; scroll only when >10 products).
- Historiku filter bar uses `.history-filters-bar` with grouped controls (32px height, vertical separators, labeled fields). Pershkrimi stretches on row 1; Totali/Produkte sit on row 2.
- Historiku list uses `table-layout: fixed` with percentage column widths (expand 3%, Data 12%, Ora 8%, Pershkrimi 22%, Lloji 9%, Shteti 17%, Produkte 8%, Totali 11%, Veprime 10%). Lloji/Shteti keep `min-width` so badges and transfer routes do not wrap awkwardly.
- Action and history-edit product tables scroll horizontally when columns need more space.
- Confirm dialogs use `.modal-overlay-stacked` so they appear above other modals (product delete, transfer finalize). Overlay dismiss uses `handleOverlayDismiss` (no click-through).
- Success snackbars use `.snackbar.success` (green); errors use `.snackbar.error` (red); modals use `.modal-close-btn` (×).
- Editing a history line item highlights the row (`.item-row-editing`, amber background).

---

## Product Overview

Inventari is a simple inventory management platform for businesses that move products between Kosovo and Albania. Instead of keeping stock numbers in manual Excel sheets, the team records each movement once in the app and the system keeps the inventory, summaries, and Excel exports up to date.

The goal is not to replace Excel as an output. The goal is to stop running the business from a fragile Excel file that only one person understands.

## What It Does

- **Legacy accounts:** track products with separate Kosovo and Albania stock; country-based actions and summary.
- **Dynamic accounts:** configurable locations (custom names/emojis), per-location stock, N-column products table, location-keyed summary and history.
- Records stock entries (`Hyrje`), exits (`Dalje`), and transfers via **Transfero** popup.
- **Historiku** — view, filter, edit, delete past actions (country or location depending on account type).
- Calculates totals automatically from quantity and unit price.
- Shows live product stock in a sortable table.
- Shows summary numbers for each country over a selected date range.
- Exports product and summary data to formatted `.xlsx` files.

## Business Logic

Each product has one shared identity, but two stock balances:

- `Gjendje Kosove`
- `Gjendje Shqiperi`

When the user records a movement, the app updates the correct country stock and stores the action history. This gives the business a clear record of what came in, what went out, when it happened, and how much it was worth.

For transfers, the user opens the **Transfero** popup from the action card. Inside that popup they choose where stock leaves from (`Nga`), where it arrives (`Te`), the action date, and the same product rows used for normal movements (product, unit price, quantity). The main action form stays focused on `Hyrje` and `Dalje` only.

Transfer is represented using the same movement logic as the rest of the system:

- `Dalje` from the source country.
- `Hyrje` into the destination country.

The existing Kosovo `Dalje` automation is still supported: a normal Kosovo `Dalje` can still be reflected as an Albania `Hyrje` in the **Permbledhje Excel** export on the same row. The explicit Transfer workflow is for cases where the user wants to choose the source and destination directly.

**Permbledhje summary vs Excel:** both treat transfers as **Dalje** in the source country and **Hyrje** in the destination. Excel additionally mirrors Kosovo `Dalje` into the Albania columns on one row when that automation applies.

## Why This Is Better Than Manual Excel Work

Manual Excel inventory usually depends on one person:

- Someone has to update rows all day.
- Formulas can break.
- Files get copied, renamed, and sent around.
- People may not know which version is the latest.
- If the "Excel person" is away, the business loses visibility.

Inventari turns that into a shared workflow:

- Staff only enter the actual business event: product, quantity, price, country, and date.
- Stock and totals are calculated automatically.
- The latest numbers are available from the app, not hidden inside someone's local file.
- The boss or manager can open the platform and check the numbers directly.
- Excel exports are still available, but they are generated from clean system data.

In other words: the app does the repetitive Excel work, while Excel becomes the report format.

## Who It Helps

Inventari is useful for a small business that wants:

- Faster daily inventory entry.
- Cleaner stock tracking across two locations or countries.
- Less dependence on one spreadsheet operator.
- Better visibility for owners and managers.
- Consistent Excel reports whenever they are needed.

## Daily Workflow

1. Add products with their code, name, and starting stock.
2. Register `Hyrje` when stock comes in.
3. Register `Dalje` when stock goes out.
4. Click **Transfero** when products move from one country to the other (opens a dedicated transfer popup).
5. Review the products table for current stock.
6. Use the summary panel to check totals by date range.
7. Download Excel reports when the business needs a formatted file.

## Value Proposition

Inventari keeps the simplicity of Excel outputs, but removes the risk of managing operations directly inside Excel.

The business gets structured inputs, automatic calculations, shared access, and reliable exports. The result is less manual work, fewer mistakes, and faster access to the numbers that matter.

## Technical Understanding

This section describes the platform from a data and workflow perspective: what the user enters, what the system stores or calculates, and what the user can read or export.

## Inputs

### Authentication

The platform starts at `/login` — a single card with **Hyr** (sign in) and **Regjistrohu** (sign up) modes. `/signup` redirects to `/login?mode=signup`.

Input fields:

- **Sign in:** `email`, `password` (`Fjalekalimi`)
- **Sign up:** optional `emri`, `email`, `password` (min 8 characters)

Optional: **Vazhdo me Google** when `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend) match the same Google Cloud Web client ID.

Legacy deployment: use `login_email` / `login_password` from `.env` (seeded once via `npm run seed:legacy-user -w backend`).

Google-only accounts (no password hash) receive a distinct API error if password login is attempted; the UI shows a message to use Google sign-in.

Purpose:

- Confirms that the user is allowed to access the inventory system.
- Keeps inventory data behind a controlled, tenant-scoped session instead of exposing it publicly.
- New dynamic accounts complete location onboarding before the main dashboard.

### Product Creation

Products are the base records used by the whole platform.

Input fields:

- `Kodi` - unique product code.
- `Emri` - product name.
- `Gjendje Kosove` - starting stock quantity in Kosovo (`NumericInput`, placeholder `0` when zero).
- `Gjendje Shqiperi` - starting stock quantity in Albania (same control).

Rules:

- `Kodi` is required.
- `Emri` is required.
- Stock quantities must be zero or higher.
- The same product code should represent the same product across both countries.

Stored result:

- A product row with one identity and two separate stock balances.
- Modal closes; green snackbar: `Produkti u shtua me sukses.`

### Product Editing

Existing products can be updated.

Editable fields:

- `Kodi`
- `Emri`
- `Gjendje Kosove`
- `Gjendje Shqiperi`

Purpose:

- Correct product names or codes.
- Adjust stock quantities when needed.
- Keep the product table aligned with the real warehouse situation.

On success: modal closes; green snackbar: `Produkti u perditesua me sukses.`

### Product Deletion

The user can delete a product.

Input:

- Product selected for deletion.
- Confirmation from the user.

Purpose:

- Removes products that should no longer exist in the inventory.

Important behavior:

- Deleting a product is treated as a serious action because product history may depend on it.

### Country Selection (Hyrje / Dalje)

On the main action card, the user selects which country the movement applies to.

Input values:

- `Kosovo`
- `Albania`

Purpose:

- Determines which stock balance is affected by a `Hyrje` or `Dalje` action.

Note: Transfer uses its own country selectors inside the transfer popup, not the main card country selector.

### Action Type (Hyrje / Dalje)

On the main action card, the user chooses the type of inventory movement.

Input values:

- `Hyrje` - stock enters inventory.
- `Dalje` - stock leaves inventory.

Purpose:

- `Hyrje` increases stock in the selected country.
- `Dalje` decreases stock in the selected country.

### Transfer Popup

Transfer is opened from the **Transfero** button on the action card. The entire transfer workflow happens inside this popup, separate from the main `Hyrje` / `Dalje` form.

Input fields:

- `Nga` - source country.
- `Te` - destination country.
- `Data e Veprimit` - action date.
- Action item rows (same structure as normal movements):
  - `Produkti` — `ProductSearchSelect` (`Emri (Kodi)`, sorted by code)
  - `Cmimi/Njesi` — `NumericInput` (placeholder `0.00` when zero)
  - `Sasia` — `NumericInput` (placeholder `1` when zero)

Rules:

- Source and destination must be different.
- The country selected in `Nga` cannot be chosen again in `Te` (that option is disabled).
- If the user changes `Nga` to match the current `Te` value, `Te` switches automatically to the other country.
- Transfer supports both directions:
  - Kosovo to Albania.
  - Albania to Kosovo.
- The source country must have enough stock for the selected products and quantities.
- At least one product row is required.
- Quantity must be greater than zero.
- Unit price must be zero or higher.
- The same product cannot be selected twice in the same transfer.

Workflow inside the popup:

1. Choose `Nga` and `Te`.
2. Set the action date.
3. Add one or more product rows with price and quantity.
4. Review the transfer total.
5. Click **Finalizo Transfertën**.
6. Confirm in the confirmation dialog (× or **Anulo** to cancel).

Stored result:

- A `Dalje` movement row for the source country.
- A `Hyrje` movement row for the destination country.

Purpose:

- Keeps transfers explicit and auditable while using the same product-entry experience as normal movements.

### Action Date

Each inventory action has a date.

Input field:

- `Data e Veprimit`

Purpose:

- Stores when the movement happened.
- Allows summaries and exports to be filtered by date range.

### Action Items (Hyrje / Dalje / Transfer)

Each action can contain one or more products. The same row structure is used on the main action card and inside the transfer popup.

Input fields per row:

- `Produkti` — `ProductSearchSelect` (search by code or name; `Emri (Kodi)`, sorted by code).
- `Cmimi/Njesi` — unit price (`NumericInput`, placeholder `0.00` when zero).
- `Sasia` — quantity (`NumericInput`, placeholder `1` when zero).

Rules:

- At least one product is required.
- Quantity must be greater than zero.
- Unit price must be zero or higher.
- The same product cannot be selected twice in the same action.

Finalize (Hyrje / Dalje on desktop):

- **Finalizo Veprimin** opens `ActionReviewModal` for a last check; user can edit `Cmimi/Njesi` and `Sasia` there before **Finalizo** submits the batch.

Calculated per row:

- `Totali = Cmimi/Njesi * Sasia`

Stored result:

- One or more inventory action records.
- Updated product stock for the selected country.
- For transfers, updated stock for both the source and destination countries.

### Historiku (Action History)

Opened from the **Historiku** button on the action card.

Filter bar (top of modal):

| Group | Fields | Scope |
| --- | --- | --- |
| Veprime / Shteti | Type and country dropdowns | Server — refetches list, resets to page 1 |
| Data | `Nga` / `Deri` date pickers | Server |
| Ora | `Nga` / `Deri` time pickers (`OraInput`, `HH:mm`) | Client — filters current page rows; batches with null Ora excluded when a bound is set |
| Pershkrimi | Text search (`Kërko…`) | Client — case-insensitive substring |
| Totali (€) | Min / Max | Client — inclusive euro range |
| Produkte | Min / Max | Client — inclusive line-item count range |

- **Pastro filtrat** (×) clears all server and client filters when any filter is active.
- Client-side filters can show **Asnjë rezultat** on a page that still has server rows; pagination count stays server-based.

List behavior:

- Paginated (**8** rows per page) in a wide modal (~**1200px**).
- Separate read-only **Data**, **Ora**, and **Pershkrimi** columns in the list (`—` when empty). **Produkte** shows the item count as a number only.
- **Data** / **Ora** / **Pershkrimi** left-aligned; **Produkte** / **Totali** / **Veprime** right-aligned (including edit/delete buttons).
- Transfer **Shteti** shows both flags inline with the route label; Pershkrimi ellipsizes with a hover tooltip when long.
- Expand a batch to see line items (product, unit price, quantity, line total).
- Multiple batches can stay expanded at once.

Edit (`Ndrysho`):

- `ActionEditModal` to change batch date, optional Ora/Pershkrimi (`OraInput`), country (or transfer route), and individual line items — **all batches**, including pre-batch `legacy:…` rows (migrated on save).
- Click **Ndrysho Produktin** on a line; the row switches to `ProductSearchSelect` + `NumericInput` fields aligned under the table headers.
- **Ruaj** / **Anulo** in the actions column; money columns stay right-aligned.
- On success: edit popup closes, row stays expanded, list refreshes, green snackbar (migrated batches may get a new UUID).

Delete (`Fshi`):

- Confirm dialog (**Anulo** neutral, red confirm).
- On success: green snackbar; products and summary refresh.

Purpose:

- Audit and correct past movements without editing the database manually.

### Summary Date Range

The summary panel is controlled by a date range.

Input fields:

- `Nga` - start date.
- `Deri` - end date.

Purpose:

- Filters the summary numbers.
- Controls which period is used for the summary Excel export.

## Outputs

### Products Table

The products table shows the current state of inventory.

Displayed columns:

- `Kodi`
- `Emri`
- `Gjendje Kosove`
- `Gjendje Shqiperi`
- Actions for edit/delete.

Behavior:

- Sorted by `Kodi` ascending by default (user can sort by code, name, Kosovo stock, or Albania stock).
- **Search** in the header filters rows by code or name without reloading the page.
- The table shows a fixed number of visible rows and scrolls internally.

Purpose:

- Gives the user a live overview of all products and their current quantities.

### Action Entry Total and Finalize (Hyrje / Dalje)

Before finalizing an action, the platform shows the action total on the action card.

Displayed value:

- Sum of all line totals in the current action.

Formula:

- `Total = sum(Cmimi/Njesi * Sasia)`

Workflow:

1. User clicks **Finalizo Veprimin** on the action card.
2. Client validates rows (at least one product, quantity > 0, price ≥ 0). Failures show a **red snackbar**; the card height stays fixed.
3. **`ActionReviewModal`** opens: large table with up to 10 visible row slots, horizontal dividers, inline price/qty edits, and footer total.
4. User confirms with **Finalizo** (or **Anulo** / × / overlay to close without submitting). Confirm runs validation again.
5. On API success: modal closes, green snackbar, action form resets, products and summary refresh.

Purpose:

- Lets the user verify and correct every line before saving, without returning to the cramped action card.

### Confirmation Messages

The platform shows feedback after important actions.

Examples:

- Green snackbar: successful inventory action, transfer, history edit/delete, product create/edit/delete.
- Red snackbar: finalize validation errors (`Sasia duhet te jete > 0.`, etc.), API errors on submit.
- Validation when adding rows (e.g. duplicate product in the same action) via default dark snackbar.
- Stock errors with full product name and code, e.g. insufficient stock on transfer or `Dalje`.

Purpose:

- Makes the workflow safer and easier to understand.

### Summary Panel

The summary panel shows totals for each country over the selected date range.

For each country, it displays:

- `Hyrje` quantity and value (includes transfer **in** as normal `Hyrje` rows).
- `Dalje` quantity and value (includes transfer **out** as normal `Dalje` rows).

Countries shown:

- Kosovo.
- Albania.

Important:

- Filters use each action’s **business date**, not when it was entered in the system.
- Extend **Deri** to include a transfer’s date if it does not appear in the totals yet.

Purpose:

- Gives management a fast view of what came in and what went out during a period.

### Products Excel Export

The products card has an Excel export button.

Output file:

- `.xlsx`

Filename format:

- `Produkte DD/MM/YYYY HH:mm.xlsx`

Columns:

- `Kodi`
- `Emri`
- `Gjendje Kosove`
- `Gjendje Shqiperi`

Sorting:

- Matches the current sort column and direction in the products table on screen.

Formatting:

- Header row has grey fill.
- Header text is bold, size 11.
- Cells use thin borders.
- Text wrapping is disabled.
- Columns are auto-sized with padding and a maximum width.

Purpose:

- Produces a clean product stock report without manual spreadsheet work.

### Summary Excel Export

The summary panel has an Excel export button. It uses the template at `docs/excel/Inventari Excel Template.xlsx`.

Output file:

- `.xlsx`

Filename format:

- `Permbledhje DD/MM/YYYY HH:mm.xlsx`

Template columns (**13 columns**, no Përshkrimi):

| Cols | Content |
| --- | --- |
| 1 | Kodi |
| 2 | Produkti (product name) |
| 3–7 | Kosova: Data, Cmimi/Njesi, Sasi, Vlefta, Gjendje |
| 8 | Spacer (empty) |
| 9–13 | Shqiperi: Data, Cmimi/Njesi, Sasi, Vlefta, Gjendje |

Behavior:

- Fills movement rows for the selected export date range (`from` / `to` query params).
- Kosovo `Dalje` that auto-mirrors to Albania fills **both** country columns on one row.
- Explicit transfers write `Dalje` on the source side and `Hyrje` on the destination side (same row when exported from Kosovo with mirror logic).
- Column widths auto-size to the longest cell in each column (max width 120 characters).
- Data cells use `wrapText: false` so names stay on one line when the column is wide enough.

Purpose:

- Gives the business a formatted Excel report based on the system data.
- Replaces manually prepared reporting sheets.

## Data Flow

1. User signs in or signs up at `/login` (password or Google).
2. Dynamic new users add locations at `/onboarding/locations`, then reach the dashboard.
3. User creates products.
4. User records stock movements.
5. The backend validates the input and scopes data by `pronari_id`.
6. The database stores products and action history.
7. Stock quantities are updated (legacy columns and/or `gjendje` table).
8. The frontend refreshes product and summary data.
9. The user views live numbers or downloads Excel reports.

## System Boundary

The platform is responsible for:

- Capturing inventory inputs.
- Validating required fields.
- Updating stock quantities.
- Showing current stock.
- Showing date-based summaries.
- Exporting formatted Excel files.

The platform is not meant to be:

- A full accounting system.
- A replacement for invoices.
- A complete ERP.
- A warehouse barcode scanner system.

It is focused on the practical inventory workflow: enter product movements once, keep stock correct, and produce the reports the business needs.

## Related docs

- [Backend API and architecture](../backend/README.md)
- [Repo root quick start](../README.md)
- [Local development](../docs/local-dev.md)
- [SQL migrations](../docs/sql/)
- [Multi-tenancy plan](../MULTI_TENANCY_PLAN.md)
