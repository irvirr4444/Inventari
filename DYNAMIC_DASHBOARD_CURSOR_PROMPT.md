# Cursor Prompt — Build the Real Dynamic Dashboard (N Locations)

> Context: infrastructure for multi-tenancy already exists — `perdorues`,
> `lokacioni`, `gjendje` tables, auth (password + Google), location
> onboarding/settings CRUD, and a session flag (`uiLloji` / `isLegacy`).
> **What's missing**: `DynamicDashboardPage` currently reuses the legacy
> `DashboardPage` component as-is ("same component today" / "reuses
> DashboardPage for now"). That component and everything under it assumes
> exactly two fixed locations (`XK` / `AL`) via `CountryProvider`. This
> prompt is the actual rewrite: make the dynamic path render **whatever
> locations the user created** — any name, any count, any order — while
> leaving the legacy path completely untouched.

---

## Hard rule — do not break legacy

Every file touched in this prompt must preserve the exact current behavior
for `isLegacy === true` users. The pattern throughout: **branch at the
component level, don't make the existing component conditionally render
different things internally.** Where a component currently hardcodes
Kosovo/Albania, create a **new sibling component** for the dynamic case and
have the parent pick one or the other based on `isLegacy` — don't sprinkle
`if (isLegacy)` deep inside shared rendering logic, since that's exactly the
kind of edit that risks shifting legacy's pixels/behavior by accident.

Naming convention used below: `XSomething` = existing/legacy (untouched),
`DynamicXSomething` = new.

---

## 1. Provider layer

**Problem**: `AppProviders` wraps *all* users in `CountryProvider`, dynamic
included, per the current frontend README. Dynamic users should never touch
`CountryProvider` — they only use `LokacioniProvider`.

- In `providers/AppProviders.tsx`: branch on `session.isLegacy`.
  - `isLegacy === true` → wrap in `CountryProvider` only (current behavior,
    untouched).
  - `isLegacy === false` → wrap in `LokacioniProvider` only. Do **not** also
    wrap in `CountryProvider` — if any shared hook still imports
    `useCountry()` directly instead of going through a shared abstraction,
    that's a bug to surface, not paper over by keeping both providers
    mounted.
- Confirm `LokacioniProvider` (already in `lib/lokacioni/`) exposes at
  minimum: `locations: Lokacioni[]` (id, emri, kodi, flagEmoji, rradhitja,
  aktiv), `activeLocations` (filtered, sorted by `rradhitja`), and a
  `refetch()`/React Query-backed list synced with `/api/lokacionet`.

## 2. Dashboard shell — stop reusing `DashboardPage` as-is

**Problem**: `DynamicDashboardPage` (`features/dynamic/`) currently renders
the legacy `DashboardPage` directly.

- Create `DynamicDashboardPage.tsx` as its own composition root (mirroring
  `DashboardPage.tsx`'s ~180-line "compose feature panels" structure, not
  importing `DashboardPage` itself). It composes:
  - `DynamicActionEntryPanel` (new, §3)
  - `DynamicProductsPanel` (new, §4 — wraps existing `ProductsPanel` table
    logic but swaps the stock-editing modal, see §4)
  - `DynamicSummaryPanel` (new, §5)
  - Reuses, unchanged: `Modal`, `ConfirmModal`, `Snackbar`, `NumericInput`,
    `ProductSearchSelect`, `DateInput`, `OraInput`/`TimePickerPopover` — none
    of these are country-specific, no changes needed.
- `App.tsx` routing: `isLegacy ? <DashboardPage /> : <DynamicDashboardPage />`
  at the `/` route — this split should already exist per the README; confirm
  it's real and not just a planned label.

## 3. Action entry (Hyrje / Dalje / Transfer) for N locations

**Files to add**: `features/dynamic/DynamicActionEntryPanel.tsx`,
`DynamicLocationSelect.tsx`, `DynamicTransferModal.tsx`.

- **Location selector** (replaces the legacy 2-pill `Kosovo`/`Albania`
  toggle): a pill row that shows all `activeLocations` inline up to ~4-5,
  and switches to a dropdown/searchable list beyond that (per the UI-scaling
  plan). Reuse the existing pill/toggle CSS class (`toggle-group`) for the
  ≤5 case so it visually matches the Hyrje/Dalje toggle already on the card.
- **Action type** (Hyrje/Dalje) stays a plain 2-value toggle — that part was
  never location-specific, no change needed.
- **Transfer** (`DynamicTransferModal`): same `Nga`/`Ne` concept, but both
  selectors are the dynamic location selector instead of a fixed pair. Reuse
  `ProductSearchSelect`'s combobox interaction pattern for `Nga`/`Ne` once
  there are more than ~4 locations, exactly as discussed. Keep "selecting a
  location in `Nga` removes it from `Ne`'s options" — that logic generalizes
  to any list length unchanged, just iterate instead of toggling a boolean.
- **`ActionItemsTable`, `useActionItems`, `NumericInput`,
  `ProductSearchSelect`**: none of these are country-specific today (they
  operate on product rows, not locations) — reuse completely unchanged.
- **`ActionReviewModal`**: header currently shows "country flag + label" —
  generalize to show the dynamic location's `flagEmoji` (or a fallback
  initial badge if null) + `emri`. This is a small prop change
  (`location: { emri, flagEmoji }` instead of a hardcoded country lookup),
  not a rewrite.
- **API payload**: `createActionBatch` for dynamic users sends
  `lokacioni_id` (and `destination_lokacioni_id` for transfers) instead of
  `shteti`/`destination_shteti`. Confirm `lib/api.ts` already branches this
  per `isLegacy`, or add the branch — legacy keeps sending `shteti` literals
  exactly as today.

## 4. Products card — stock fields for N locations

**File to add**: `features/dynamic/DynamicProductFormModal.tsx` (the rest of
`ProductsPanel`'s table/search/sort/export-button chrome is reusable as-is —
only the stock-editing modal is location-count-specific).

- Replace the legacy "two side-by-side cards" with:
  - **≤ 3 active locations** → same card visual language, in a wrapping
    responsive grid (`grid-template-columns: repeat(auto-fit, minmax(160px,
    1fr))` or similar) instead of two fixed-width cards.
  - **> 3 active locations** → compact table: `Lokacioni | Sasia` rows,
    each `Sasia` cell an inline `NumericInput`, scrollable past ~6 rows.
- Backing data: replace `gjendje_kosove`/`gjendje_shqiperi` fields with a
  `stock: Record<lokacioniId, number>` shape sourced from the `gjendje`
  table via `/api/products` (dynamic DTO shape — confirm
  `legacyDtoService.ts` vs the dynamic product mapping already split this on
  the backend per the README; if so this is just consuming the existing
  shape, not inventing a new one).
- Products **table** columns: legacy keeps `Gjendje Kosove` / `Gjendje
  Shqiperi` fixed columns unchanged. Dynamic table renders one stock column
  per active location, ordered by `rradhitja` — this needs a small dynamic
  `<colgroup>`/header-row generation in `DynamicProductsPanel`, reusing the
  same `<table>` markup/CSS classes as the legacy products table so styling
  matches without new CSS.

## 5. Summary panel (Permbledhje) for N locations

**File to add**: `features/dynamic/DynamicSummaryPanel.tsx`.

- **≤ 3 active locations** → same two/three-card visual layout, wrapping
  grid.
- **> 3** → `Lokacioni | Hyrje | Dalje` table, one row per location.
- Respect the "show in summary" per-location toggle from Locations settings
  (if not yet built, add it now as part of `LocationsSettingsPage` — a
  simple boolean column on `lokacioni`, e.g. `shfaq_ne_permbledhje boolean
  default true`).
- API: `/api/analytics/summary` for dynamic users returns
  `{ [lokacioniId]: { hyrje: {...}, dalje: {...} } }` instead of `{ XK:
  {...}, AL: {...} }` — confirm backend already branches this, since the
  README lists "Hyrje/Dalje totals for date range (by country or location)"
  as already split.

## 6. History (Historiku) — location filter and display

- **Filter bar**: legacy keeps the fixed `Shteti` dropdown unchanged.
  Dynamic version (`DynamicHistoryFilterBar` or a prop-driven variant of the
  existing one) replaces the single-select with a multi-select checkbox list
  of active locations, still client-applied like the other client-side
  filters (no extra API calls, per existing `historyClientFilters.ts`
  pattern — extend that file with a `locationIds: string[]` filter rather
  than writing new filter plumbing).
- **List "Shteti" column**: rename header to "Lokacioni" for dynamic
  accounts only (legacy keeps "Shteti"). Transfer route display
  (`[flag] A → B [flag]`) needs zero logic change — it already takes
  arbitrary strings, just feed it the dynamic location's `emri`/`flagEmoji`
  instead of the country lookup.
- **Edit modal** (`ActionEditModal`): location pickers inside it become the
  same `DynamicLocationSelect` component from §3 for dynamic batches.

## 7. Excel exports

- **Products export**: dynamic version generates one stock column per
  active location (ordered by `rradhitja`) instead of the fixed two —
  confirm/extend `exportsService.ts`'s existing legacy/dynamic split.
- **Permbledhje export**: legacy keeps the exact 13-column template
  (`Inventari Excel Template.xlsx`), untouched. Dynamic export uses a
  **different, new template/generation path**: one row per movement with a
  `Lokacioni` column (tidy/long format) plus a second sheet with
  per-location pivot totals for the date range. This is new ExcelJS
  generation code in `exportsService.ts`/`inventariExcel.ts` — not a
  parametrized version of the existing 13-column layout, since that layout
  fundamentally can't widen past ~3 locations and still be readable.

## 8. What "done" looks like — acceptance check

Create a test dynamic account with **4 arbitrarily named locations** (not 2,
not named after countries — e.g. "Tirana Warehouse," "Durrës Depo," "Korçë
Store," "Online Stock") and confirm:

- Product creation shows 4 stock inputs (grid, since ≤3 triggers cards but
  4 should trigger the table — verify the cutoff feels right, adjust if 4
  still looks fine as cards).
- An Hyrje/Dalje action can target any of the 4.
- A transfer can move stock between any two of the 4, in either direction.
- Summary panel shows all 4 (or fewer, if some are toggled off "show in
  summary").
- Historiku filter can multi-select among the 4.
- Both exports (products + Permbledhje) reflect all 4 correctly.
- Throughout this entire test, **separately** re-verify the original legacy
  account's dashboard, products modal, transfer popup, summary panel,
  history modal, and both exports render **pixel-identical** to before this
  prompt — nothing in §1–7 should have touched a legacy-rendering code path.

## 9. Explicit non-goals for this prompt

- Mobile dynamic UI (the dynamic *desktop* dashboard is the scope here;
  mobile's existing card-list/bottom-sheet patterns already generalize well
  per earlier discussion, but wiring mobile to `LokacioniProvider` is a
  separate follow-up prompt).
- Per-location permissions, multi-seat orgs — still out of scope per the
  multi-tenancy plan.
- Redesigning the legacy desktop UI in any way, for any reason.
