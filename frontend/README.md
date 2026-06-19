# Inventari Frontend

React client for the Inventari inventory platform. This README covers local development and **desktop** product behavior (dashboard at `/` on wide screens). Mobile behavior is summarized in the [Mobile web app](#mobile-web-app) section.

## Development

### Stack

- React 19 + TypeScript
- Vite 8
- TanStack Query for server state
- Plain CSS in `src/styles/` (import hub via `src/index.css`; no component library)

The browser talks only to the backend API. Supabase credentials stay on the server.

### Prerequisites

- Node.js 20+
- Backend running on `http://localhost:3001` (see [backend/README.md](../backend/README.md) and repo root [README.md](../README.md))

### Setup

From the repository root:

```bash
npm install
cp frontend/.env.example frontend/.env
npm run dev
```

Or run only the frontend workspace:

```bash
npm install
npm -w frontend run dev
```

Vite serves the app on `http://localhost:5173` and proxies `/api` to the backend.

### Scripts

| Command | Description |
| --- | --- |
| `npm -w frontend run dev` | Start Vite dev server |
| `npm -w frontend run build` | Typecheck and build for production |
| `npm -w frontend run lint` | Run ESLint |
| `npm -w frontend run preview` | Preview the production build |

From the repo root: `npm run dev` starts backend and frontend together. `npm run test` runs shared + backend unit tests (frontend has no test suite yet).

### Environment

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_BASE_URL=/api
```

In development, Vite proxies `/api` to `http://localhost:3001`. In production, set `VITE_API_BASE_URL` to the public API base URL if it differs.

### Project structure

```text
frontend/
  src/
    App.tsx                    Login gate and authenticated shell
    main.tsx                   App bootstrap + React Query provider
    index.css                  Imports styles/index.css hub
    styles/                    Design tokens, components, features, responsive
    components/                Modal, ConfirmModal, DateInput, OraInput, TimePickerPopover,
                               Snackbar, NumericInput, ProductSearchSelect, icons, …
    hooks/                     useSnackbar, useActionItems, feature hooks (products, actions, history, summary)
    mobile/                    Purpose-built mobile UI at /mobile (see Mobile section below)
      MobileApp.tsx            Shell, tab state, header with Dil
      components/              BottomSheet, BottomNav, cards, pickers, …
      tabs/                    Veprime, Transfer, Produkte, Histori, Permbledhje
      styles/                  Mobile-only CSS (imports tokens.css only)
    features/
      actions/                 ActionEntryPanel, ActionItemsTable, ActionReviewModal, TransferModal
      products/                ProductsPanel, ProductFormModal
      summary/                 SummaryPanel, CountrySummary
      history/                 HistoryModal, HistoryFilterBar, HistoryBatchMetaDisplay, historyBadges, edit/list submodules
    pages/
      DashboardPage.tsx        Composes feature panels (~180 lines)
      LoginPage.tsx            Login form
      useDashboardPage.ts      Dashboard state, queries, mutations
    lib/
      api.ts                   Backend API client
      country.tsx              Country context + selector (XK / AL)
      format.ts                Re-exports shared formatters + UI helpers
      actionMeta.ts            Ora display/format helpers for batch metadata
      actionBatch.ts           Legacy batch id helper (`legacy:…` ids in list until first save migrates them)
      historyClientFilters.ts  Client-side Historiku filter logic (Ora, Pershkrimi, Totali, Produkte)
      historyBatchEdit.ts      Batch edit validation/save (metadata + add/update/delete product lines)
      numericInput.ts          Helpers for zero-as-placeholder numeric fields
      queryKeys.ts             React Query key factories
      invalidateAppData.ts     Cache invalidation helper
      dates.ts                 Date helpers
    types/
      actionItem.ts            Action line-item draft type
  public/                      Static assets (flags, icons)
  vite.config.ts               Dev server + API proxy + @inventari/shared alias
packages/shared/               Zod schemas, productLabel, buildSummaryByCountry (workspace)
```

### Desktop UI architecture

On viewports **wider than the mobile breakpoint** (`useMobileClient`), `App.tsx` renders `DashboardPage` — a single-screen dashboard composed from feature modules under `src/features/`.

The screen has three areas:

1. **Action card** — `Hyrje` / `Dalje` entry with country selector, date, optional **Ora** (`HH:mm`) and **Pershkrimi** (max 500 chars), product rows, total, and **Finalizo Veprimin**. **Historiku** opens the action history modal.
2. **Products card** — sortable product table, add/edit/delete, Excel export.
3. **Summary panel** — per-country totals for a date range and Excel export.

The dashboard is **viewport-locked** on desktop (~1080p): the action card keeps a fixed height (product rows scroll inside the table after 2 lines), the products table fills its card and scrolls internally, and the summary panel stays compact below.

#### Action card and finalize review

- **Product rows** use `ActionItemsTable` with a **fixed 2-row** scroll area (`--action-visible-rows: 2`, `--action-row-height: 62px`). Row 3+ scroll inside the card; a reserved hint slot shows `↕ N produkte — scroll për të parë të gjitha` when needed (no layout jump when the hint appears).
- Optional **Ora** and **Pershkrimi** sit below the date row (`ActionMetaFields`); **Ora** uses `OraInput` with a portal time picker (`TimePickerPopover`, `HH:mm`). Empty values are omitted from `POST /api/actions`. Both are stored on `veprim_batch` (one set per action/transfer batch).
- **Finalizo Veprimin** validates line items first; invalid input shows a **red error snackbar** (e.g. `Sasia duhet te jete > 0.`) without growing the action card.
- On success, validation opens **`ActionReviewModal`** — a large review sheet (`max-width: 960px`, ~10 visible row slots) instead of the small `ConfirmModal` text dialog.
- Review modal header: title, `LlojiBadge` (Hyrje/Dalje), country flag + label, formatted action date (with Ora when set), product count; **Pershkrimi** shown below when set (`ActionMetaDisplay`).
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

- Button on the right of the Hyrje/Dalje toggle row opens `HistoryModal` (~**1200px** wide).
- **Filter bar** (`HistoryFilterBar`) — horizontal grouped row with uppercase labels; wraps to two rows on narrow widths.
  - **Server-side** (API + page reset): **Veprime** (type), **Shteti**, **Data** (`Nga` / `Deri` date pickers).
  - **Client-side** (current page only, no extra API calls): **Ora** range (`OraInput`), **Pershkrimi** search (substring, case-insensitive), **Totali (€)** Min/Max, **Produkte** count Min/Max.
  - **Pershkrimi** input flex-grows to fill the first row; **× Pastro filtrat** appears when any filter is active and resets all fields.
  - Filter logic lives in `lib/historyClientFilters.ts`; state is split in `HistoryModal` (server vs client filters).
- Paginated table (**8 per page**); pagination total reflects server filters only.
- List columns: **Data**, **Ora**, **Pershkrimi**, **Lloji**, **Shteti**, **Produkte**, **Totali**, **Veprime** (read-only in the list; empty Ora/Pershkrimi show `—`).
- **Data**, **Ora**, and **Pershkrimi** are left-aligned; **Produkte**, **Totali**, and **Veprime** are right-aligned. Edit/delete icon buttons sit flush right in **Veprime**.
- **Pershkrimi** gets the widest meta column (~**22%**); long text ellipsizes with the full value in a `title` tooltip.
- **Produkte** shows the line-item **count only** (e.g. `3`), not `3 produkte`. Column is compact (~**8%**); **Totali** is wider (~**11%**) for euro amounts.
- **Shteti** for transfers renders inline as `[flag] Kosove → Shqiperi [flag]` — both flags stay next to the route text (not pinned to the column edge). Non-transfer rows show one flag + country label.
- Batch meta cells (`HistoryBatchMetaDisplay`) and badges (`historyBadges`: `LlojiBadge`, `CountryCell`) keep list markup consistent.
- Expand a row to view product line items; multiple rows can stay expanded at once.
- **Ndrysho** opens `ActionEditModal` (`max-width: 860px`) to edit batch **Data**, **Ora**, **Pershkrimi**, country/route, and product lines. All batches are editable — pre-batch rows (`legacy:…` ids) **auto-migrate** to a real `veprim_batch` on save and receive a normal UUID.
- Inline product edit keeps the **same table columns** as the read-only row (Produkti, Cmimi/Njesi, Sasia, Totali) — no duplicate labels inside the row. **Ruaj** / **Anulo** sit in the actions column.
- Edit row uses `ProductSearchSelect` + `NumericInput`, matching the main action form.
- **Fshi** deletes the whole action after confirmation.
- Successful edit or delete closes the edit popup (when applicable), refreshes list/detail data, and shows a **green success snackbar**.
- Products display as **`Emri (Kodi)`** everywhere (history, pickers, errors).

#### Transfer

Transfer is separate from the main action form:

- The **Transfero** button opens `TransferModal`.
- The modal contains route selectors (`Nga` / `Ne`), action date, optional **Ora** (`OraInput`) / **Pershkrimi**, the same `ActionItemsTable` as normal actions, total, and **Finalizo Transfertën**.
- The country chosen in `Nga` is disabled in `Ne`.
- Submit opens a **confirmation dialog** stacked above the transfer modal, then sends `POST /api/actions` with `lloji: 'Transfer'`, `shteti`, and `destination_shteti`.
- On success: transfer modal closes, **green snackbar**, products and summary refresh.
- Insufficient-stock errors show the full product label, e.g. `CONCEPTASE (X 10 ML,STD) (6)`.

#### Products card

- Search field in the header filters the table by **kodi** or **emri** (live, case-insensitive).
- Product pickers list products sorted by **kodi** (numeric-aware).
- **Add** / **edit** open `ProductFormModal` with:
  - Kod + Emri in a two-column row.
  - **Gjendje** as two side-by-side cards (Kosova / Shqiperia): flag + country label on top, full-width `NumericInput` below (placeholder `0` when stock is zero).
  - **×** close in the modal header; **Anulo** / **Ruaj** in the footer.
- On successful **create** or **edit**: modal closes and a **green snackbar** confirms (`Produkti u shtua…` / `Produkti u perditesua…`).
- **Delete** uses `ConfirmModal` (**Anulo** neutral, confirm button red).

#### Summary panel (Permbledhje)

- One API call returns totals for **both** Kosovo and Albania for the selected date range.
- **Transfers** are included in the same buckets as normal movements: source country **Dalje**, destination country **Hyrje** (no separate transfer columns).
- Totals filter by **action date** (`Data e Veprimit`), not created-at — ensure **Deri** includes the transfer date to see it in the summary.

#### Feedback (snackbars)

- Green success snackbar (`.snackbar.success`) for: registered actions/transfers, successful history edits/deletes, product create/edit/delete.
- Red error snackbar (`.snackbar.error`) for: action/transfer finalize validation failures, API errors on submit, invalid edits in the review modal.
- Dark default snackbar for other messages (e.g. duplicate product in a row).

#### Shared desktop UI and hooks

- `features/actions/ActionItemsTable` — product rows for action form and transfer modal.
- `features/actions/ActionMetaFields` / `ActionMetaDisplay` — optional Ora + Pershkrimi entry and read-only display (`OraInput` + text field).
- `features/history/HistoryFilterBar`, `features/history/HistoryBatchMetaDisplay`, `features/history/historyBadges` — filter bar, history list meta columns, and type/country badges.
- `lib/historyClientFilters.ts` — client-side Historiku filters applied after the paginated list fetch.
- `components/OraInput`, `components/TimePickerPopover` — shared time entry (`HH:mm`) for actions, transfers, and history edit.
- `features/actions/ActionReviewModal` — large finalize review for Hyrje/Dalje (desktop).
- `features/actions/TransferModal`, `features/products/ProductFormModal` — use `Modal`, `ErrorAlert`, `CountrySelect`, `StockFields`, `NumericInput`.
- `components/ProductSearchSelect`, `components/NumericInput`, `components/ConfirmModal`, `DateInput`, `Snackbar`, `icons`.
- `hooks/useActionItems` — line-item add/remove/validate (used twice: action + transfer).
- `hooks/useSnackbar` — toast state + auto-dismiss (dashboard + login).
- `pages/useDashboardPage.ts` — queries, mutations, and modal state for the dashboard.
- `lib/queryKeys` + `lib/invalidateAppData` — centralized React Query cache updates.

Run `docs/sql/05_veprim_batch.sql` in Supabase before using Historiku. Run `docs/sql/06_veprim_batch_ora_pershkrimi.sql` to add optional **Ora** and **Pershkrimi** on `veprim_batch` (batch-level metadata, not on individual `veprimi` line rows). New actions get a `batch_id`; history lists grouped batches only. Rows created before batch support appear with `legacy:…` ids until the first edit saves them into `veprim_batch`.

### Mobile web app

On **phones and small touch devices**, the app opens the mobile UI automatically at **`/`** (no `/mobile` path needed). Detection uses screen width, touch capability, and user agent.

| Route | Desktop | Phone |
| --- | --- | --- |
| `/` | Dashboard | Mobile app (bottom tabs) |
| `/mobile` | Redirects to `/` | Redirects to `/` |

For manual testing on desktop, resize the browser below 768px, use DevTools device mode, or open **`http://localhost:5173/?mobile=1`** to force the mobile UI.

Open **`http://<your-ip>:5173/`** on your phone (same Wi‑Fi). See [docs/local-dev.md](../docs/local-dev.md) for LAN setup.

**Navigation:** fixed bottom tab bar — Veprime | Transfer | Produkte | Histori | Permbledhje.

**Interaction model:**

- Bottom sheets instead of modal stacks (add product rows, confirm finalize, edit/delete). Desktop Hyrje/Dalje uses **`ActionReviewModal`** for finalize; mobile still uses a compact **BottomSheet** confirm.
- Card lists instead of tables; touch targets ≥48px.
- Sticky **FINALIZO** CTAs on Veprime and Transfer tabs.
- Veprime and Transfer tabs include optional **Ora** (`OraInput`) / **Pershkrimi** fields; Histori list cards and detail show them when set (date · ora on one line; Pershkrimi as a muted truncated second line with `title` tooltip).
- **Histori tab filters:** type/country chips + date row (server-side, via `useHistoryBatches`); **Filtrat e avancuara ▾** pill opens a collapsible panel for client-side **Ora**, **Pershkrimi**, **Totali**, and **Produkte** filters (reuses `lib/historyClientFilters.ts`; **Apliko** / **Pastro**; active dot on pill when advanced filters are on).
- **Histori batch edit** (`HistoriBatchDetail`): tap **Ndrysho** for a **full-screen edit form** (read view hidden). Header shows **Ndrysho** with back → cancel (unsaved-changes `BottomSheet` when dirty). Sections **DETAJET** (date, country/route, Ora, Pershkrimi) and **PRODUKTET** (all rows editable via `ProductPickerSheet` + `NumericInput`, live line totals, **+ Shto Produkt**, row remove). Sticky footer: **Totali i veprimit** + **Ruaj Ndryshimet**. Saves via `lib/historyBatchEdit.ts` (`updateActionBatch`, `createActionBatchItem`, `deleteActionBatchItem`). Pre-batch actions migrate on first save like desktop.
- Histori detail is an in-tab stack (back button), not a URL route in v1.
- Same API payloads, Albanian strings, and business rules as desktop.

**Structure:**

```text
src/mobile/
  MobileApp.tsx           Shell + tab routing (useState, instant switch)
  types.ts                TabId union
  components/             BottomSheet, BottomNav, HistoriAdvancedFiltersPanel, ProductRowCard, …
  tabs/                   One file per tab (+ HistoriBatchDetail)
  styles/                 mobile.css hub (tokens + layout + components)
```

**Shared libs/hooks** (used by desktop and mobile):

- `useProductsQuery`, `useActionEntry`, `useTransferEntry`, `useProductCrud`, `useSummaryQuery`, `useHistoryBatches`
- `lib/historyClientFilters.ts` — client-side Historiku filters (desktop modal + mobile advanced panel)
- `lib/historyBatchEdit.ts` — batch edit validation/save orchestration (mobile Histori detail; ordered rows, dirty check, add/update/delete lines)
- Desktop `useDashboardPage.ts` composes these; mobile tabs call them directly.

Design reference: [MOBILE_DESIGN_PROMPT.md](../MOBILE_DESIGN_PROMPT.md) at repo root.

### API client

`src/lib/api.ts` wraps all backend calls with cookie-based auth (`credentials: 'include'`).

Main endpoints used by the UI:

| Function | Purpose |
| --- | --- |
| `login` / `logout` / `currentSession` | Authentication |
| `listProducts` / `createProduct` / `updateProduct` / `deleteProduct` | Product CRUD |
| `createActionBatch` | Register `Hyrje`, `Dalje`, or `Transfer` |
| `listActionBatches` / `getActionBatch` | Paginated history list and detail |
| `updateActionBatch` / `updateActionBatchItem` / `createActionBatchItem` / `deleteActionBatchItem` / `deleteActionBatch` | Edit or delete past actions (PATCH may return `batch_id` when a legacy batch migrates) |
| `analyticsSummary` | Summary panel numbers (both countries, one request) |
| `exportProductsUrl` | Products `.xlsx` download |
| `exportUrl` | Summary `.xlsx` download |

Transfer payload shape:

```ts
createActionBatch({
  lloji: 'Transfer',
  shteti: 'XK',              // source country
  destination_shteti: 'AL',  // destination country
  data: '2026-06-17',
  ora: '09:30',              // optional HH:mm
  pershkrimi: '…',           // optional, max 500 chars
  items: [{ kodi_produktit, cmimi_njesi, sasia }],
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
| `components/time-input.css` | Ora field + time picker popover |
| `components/forms.css` | Form layout, stock field cards (`stock-fields-grid`) |
| `components/modals.css` | Modals, snackbar, stacked overlay, `action-review-modal` |
| `components/product-search-select.css` | Searchable product combobox + portal list |
| `components/stock-badges.css` | Stock badges |
| `features/dashboard.css` | Layout, cards, tables, toggles, action table scroll (2-row cap) |
| `features/summary.css` | Permbledhje panel |
| `features/history.css` | Historiku modal (horizontal filter bar, fixed column widths, alignment, transfer route flags), edit subtable, inline edit row highlight |
| `responsive.css` | Breakpoints (stock cards stack on narrow desktop widths) |

- Dashboard layout is viewport-locked with internal scrolling in the action table (2 rows), products table, and review modal list (10 row slots; scroll only when >10 products).
- Historiku filter bar uses `.history-filters-bar` with grouped controls (32px height, vertical separators, labeled fields). Pershkrimi stretches on row 1; Totali/Produkte sit on row 2.
- Historiku list uses `table-layout: fixed` with percentage column widths (expand 3%, Data 12%, Ora 8%, Pershkrimi 22%, Lloji 9%, Shteti 17%, Produkte 8%, Totali 11%, Veprime 10%). Lloji/Shteti keep `min-width` so badges and transfer routes do not wrap awkwardly.
- Action and history-edit product tables scroll horizontally when columns need more space.
- Confirm dialogs use `.modal-overlay-stacked` so they appear above other modals (product delete, transfer finalize).
- Success snackbars use `.snackbar.success` (green); errors use `.snackbar.error` (red); modals use `.modal-close-btn` (×).
- Editing a history line item highlights the row (`.item-row-editing`, amber background).

---

## Product Overview

Inventari is a simple inventory management platform for businesses that move products between Kosovo and Albania. Instead of keeping stock numbers in manual Excel sheets, the team records each movement once in the app and the system keeps the inventory, summaries, and Excel exports up to date.

The goal is not to replace Excel as an output. The goal is to stop running the business from a fragile Excel file that only one person understands.

## What It Does

- Tracks products by code and name.
- Keeps separate stock quantities for Kosovo and Albania.
- Records stock entries (`Hyrje`), exits (`Dalje`), and country-to-country transfers via the **Transfero** popup.
- **Historiku** modal to view, filter (type/country/date + client-side Ora/Pershkrimi/Totali/Produkte), edit, and delete past actions.
- Calculates totals automatically from quantity and unit price.
- Shows live product stock in a sortable table.
- Shows summary numbers for each country over a selected date range.
- Exports product and summary data to formatted `.xlsx` files.

## Business Logic

Each product has one shared identity, but two stock balances:

- `Gjendje Kosove`
- `Gjendje Shqiperi`

When the user records a movement, the app updates the correct country stock and stores the action history. This gives the business a clear record of what came in, what went out, when it happened, and how much it was worth.

For transfers, the user opens the **Transfero** popup from the action card. Inside that popup they choose where stock leaves from (`Nga`), where it arrives (`Ne`), the action date, and the same product rows used for normal movements (product, unit price, quantity). The main action form stays focused on `Hyrje` and `Dalje` only.

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

The platform starts with a login step.

Input fields:

- `email`
- `password`

Purpose:

- Confirms that the user is allowed to access the inventory system.
- Keeps inventory data behind a controlled session instead of exposing it publicly.

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
- `Ne` - destination country.
- `Data e Veprimit` - action date.
- Action item rows (same structure as normal movements):
  - `Produkti` — `ProductSearchSelect` (`Emri (Kodi)`, sorted by code)
  - `Cmimi/Njesi` — `NumericInput` (placeholder `0.00` when zero)
  - `Sasia` — `NumericInput` (placeholder `1` when zero)

Rules:

- Source and destination must be different.
- The country selected in `Nga` cannot be chosen again in `Ne` (that option is disabled).
- If the user changes `Nga` to match the current `Ne` value, `Ne` switches automatically to the other country.
- Transfer supports both directions:
  - Kosovo to Albania.
  - Albania to Kosovo.
- The source country must have enough stock for the selected products and quantities.
- At least one product row is required.
- Quantity must be greater than zero.
- Unit price must be zero or higher.
- The same product cannot be selected twice in the same transfer.

Workflow inside the popup:

1. Choose `Nga` and `Ne`.
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

1. User creates products.
2. User records stock movements.
3. The backend validates the input.
4. The database stores products and action history.
5. Stock quantities are updated.
6. The frontend refreshes product and summary data.
7. The user views live numbers or downloads Excel reports.

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
